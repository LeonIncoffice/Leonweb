// 使用KV存储来保存建议，确保数据持久性
// 请在Cloudflare Workers控制台中创建一个名为"SUGGESTIONS"的KV命名空间
// 然后将其绑定到此Worker

// 初始化建议数组，用于内存缓存
let suggestions = []
// 初始化IP列表，用于内存缓存
let ipList = []
// 初始化需要显示协议的IP列表
let agreementPendingIPs = []

// 从KV加载建议
async function loadSuggestionsFromKV() {
  try {
    const storedSuggestions = await SUGGESTIONS.get('all-suggestions', { type: 'json' })
    if (storedSuggestions && Array.isArray(storedSuggestions)) {
      suggestions = storedSuggestions
    }
  } catch (error) {
    console.error('从KV加载建议失败:', error)
  }
}

// 保存建议到KV
async function saveSuggestionsToKV() {
  try {
    await SUGGESTIONS.put('all-suggestions', JSON.stringify(suggestions))
  } catch (error) {
    console.error('保存建议到KV失败:', error)
  }
}

// 从KV加载IP列表
async function loadIPListFromKV() {
  try {
    const storedIPs = await SUGGESTIONS.get('ip-list', { type: 'json' })
    if (storedIPs && Array.isArray(storedIPs)) {
      ipList = storedIPs
    }
  } catch (error) {
    console.error('从KV加载IP列表失败:', error)
  }
}

// 保存IP列表到KV
async function saveIPListToKV() {
  try {
    await SUGGESTIONS.put('ip-list', JSON.stringify(ipList))
  } catch (error) {
    console.error('保存IP列表到KV失败:', error)
  }
}

// 从KV加载需要显示协议的IP列表
async function loadAgreementPendingIPsFromKV() {
  try {
    const storedIPs = await SUGGESTIONS.get('agreement-pending-ips', { type: 'json' })
    if (storedIPs && Array.isArray(storedIPs)) {
      agreementPendingIPs = storedIPs
    }
  } catch (error) {
    console.error('从KV加载待显示协议的IP列表失败:', error)
  }
}

// 保存需要显示协议的IP列表到KV
async function saveAgreementPendingIPsToKV() {
  try {
    await SUGGESTIONS.put('agreement-pending-ips', JSON.stringify(agreementPendingIPs))
  } catch (error) {
    console.error('保存待显示协议的IP列表到KV失败:', error)
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 首次请求时从KV加载数据
  try {
    if (suggestions.length === 0) {
      await loadSuggestionsFromKV()
      // 确保suggestions是数组
      if (!Array.isArray(suggestions)) {
        console.error('初始化后suggestions不是数组:', suggestions)
        suggestions = []
      }
    }
    
    if (ipList.length === 0) {
      await loadIPListFromKV()
      // 确保ipList是数组
      if (!Array.isArray(ipList)) {
        console.error('初始化后ipList不是数组:', ipList)
        ipList = []
      }
    }
    
    if (agreementPendingIPs.length === 0) {
      await loadAgreementPendingIPsFromKV()
      // 确保agreementPendingIPs是数组
      if (!Array.isArray(agreementPendingIPs)) {
        console.error('初始化后agreementPendingIPs不是数组:', agreementPendingIPs)
        agreementPendingIPs = []
      }
    }
  } catch (error) {
    console.error('初始化数据时出错:', error)
    // 确保数据结构有效
    if (!Array.isArray(suggestions)) suggestions = []
    if (!Array.isArray(ipList)) ipList = []
    if (!Array.isArray(agreementPendingIPs)) agreementPendingIPs = []
  }

  const url = new URL(request.url)
  
  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }
  
  if (url.pathname.startsWith('/api')) {
    // 处理 API 请求
    return new Response('Hello from Cloudflare Workers!', {
      headers: { 
        'content-type': 'text/plain;charset=utf-8',
        'Access-Control-Allow-Origin': '*', // 添加 CORS 头
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    })
  } else if (url.pathname.startsWith('/submit-suggestion')) {
    // 处理提交建议请求
    if (request.method === 'POST') {
      const requestBody = await request.json()
      const suggestionContent = requestBody.suggestion
      const ip = requestBody.ip || '未知IP'
      
      // 创建带时间戳和IP的建议对象
      const suggestion = {
        content: suggestionContent,
        timestamp: new Date().toISOString(),
        ip: ip
      }
      
      // 添加到内存中的建议数组
      suggestions.push(suggestion)
      
      // 保存到KV存储
      await saveSuggestionsToKV()
      
      return new Response(JSON.stringify({ message: '反馈提交成功！' }), {
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*', // 添加 CORS 头
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/view-suggestions')) {
    // 返回所有提交的建议
    try {
      // 确保suggestions是数组
      if (!Array.isArray(suggestions)) {
        console.error('suggestions不是数组:', suggestions)
        suggestions = []
      }
      
      return new Response(JSON.stringify(suggestions), {
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*', // 添加 CORS 头
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    } catch (error) {
      console.error('获取建议列表时出错:', error)
      // 返回错误信息
      return new Response(JSON.stringify({ error: '获取建议列表失败', message: error.message }), {
        status: 500,
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    }
  } else if (url.pathname.startsWith('/record-ip')) {
    // 记录用户IP
    if (request.method === 'POST') {
      const requestBody = await request.json()
      const ip = requestBody.ip
      
      if (ip && !ipList.includes(ip)) {
        ipList.push(ip)
        await saveIPListToKV()
      }
      
      return new Response(JSON.stringify({ message: 'IP已记录' }), {
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/remove-ip')) {
    // 删除指定IP
    if (request.method === 'POST') {
      try {
        const requestBody = await request.json()
        const ip = requestBody.ip
        
        if (!ip) {
          throw new Error('缺少IP参数')
        }
        
        // 从列表中移除IP
        const initialLength = ipList.length
        ipList = ipList.filter(item => item !== ip)
        
        // 如果IP列表有变化，保存到KV
        if (initialLength !== ipList.length) {
          await saveIPListToKV()
          return new Response(JSON.stringify({ 
            message: 'IP已删除',
            removed: true,
            ip: ip,
            remainingCount: ipList.length
          }), {
            headers: { 
              'content-type': 'application/json;charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
          })
        } else {
          // IP不在列表中
          return new Response(JSON.stringify({ 
            message: 'IP不在列表中',
            removed: false,
            ip: ip
          }), {
            headers: { 
              'content-type': 'application/json;charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
          })
        }
      } catch (error) {
        console.error('删除IP时出错:', error)
        return new Response(JSON.stringify({ 
          error: '删除IP失败', 
          message: error.message 
        }), {
          status: 400,
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      }
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/get-ips')) {
    // 获取所有记录的IP
    try {
      // 确保ipList是数组
      if (!Array.isArray(ipList)) {
        console.error('ipList不是数组:', ipList)
        ipList = []
      }
      
      // 返回JSON响应
      return new Response(JSON.stringify(ipList), {
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    } catch (error) {
      console.error('获取IP列表时出错:', error)
      // 返回错误信息
      return new Response(JSON.stringify({ error: '获取IP列表失败', message: error.message }), {
        status: 500,
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    }
  } else if (url.pathname.startsWith('/push-agreement')) {
    // 推送协议到指定IP
    if (request.method === 'POST') {
      try {
        const requestBody = await request.json()
        const targetIPs = requestBody.ips || []
        
        if (!Array.isArray(targetIPs)) {
          throw new Error('ips参数必须是数组')
        }
        
        // 将目标IP添加到待显示协议的列表中
        targetIPs.forEach(ip => {
          if (ip && !agreementPendingIPs.includes(ip)) {
            agreementPendingIPs.push(ip)
          }
        })
        
        // 保存到KV
        await saveAgreementPendingIPsToKV()
        
        return new Response(JSON.stringify({ 
          message: '协议已推送到指定IP', 
          count: targetIPs.length,
          pendingTotal: agreementPendingIPs.length
        }), {
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      } catch (error) {
        console.error('推送协议时出错:', error)
        return new Response(JSON.stringify({ error: '推送协议失败', message: error.message }), {
          status: 400,
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      }
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/check-agreement')) {
    // 检查当前IP是否需要显示协议
    try {
      // 获取客户端IP
      let clientIP = request.headers.get('CF-Connecting-IP') || '未知IP'
      
      // 如果是POST请求，尝试从请求体获取IP
      if (request.method === 'POST') {
        try {
          const requestBody = await request.json()
          if (requestBody && requestBody.ip) {
            clientIP = requestBody.ip
          }
        } catch (e) {
          console.error('解析请求体失败:', e)
        }
      }
      
      const shouldShowAgreement = agreementPendingIPs.includes(clientIP)
      
      // 如果需要显示协议，从列表中移除该IP
      if (shouldShowAgreement) {
        agreementPendingIPs = agreementPendingIPs.filter(ip => ip !== clientIP)
        await saveAgreementPendingIPsToKV()
      }
      
      return new Response(JSON.stringify({ 
        shouldShowAgreement,
        ip: clientIP
      }), {
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    } catch (error) {
      console.error('检查协议状态时出错:', error)
      return new Response(JSON.stringify({ error: '检查协议状态失败', message: error.message }), {
        status: 500,
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    }
  } else if (url.pathname.startsWith('/accept-agreement')) {
    // 记录用户接受协议
    if (request.method === 'POST') {
      try {
        const requestBody = await request.json()
        const clientIP = requestBody.ip || request.headers.get('CF-Connecting-IP') || '未知IP'
        
        // 这里可以添加更多逻辑，例如记录哪些IP接受了协议
        console.log(`用户 ${clientIP} 接受了协议`)
        
        return new Response(JSON.stringify({ 
          message: '协议接受已记录',
          ip: clientIP,
          status: 'accepted'
        }), {
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      } catch (error) {
        console.error('记录协议接受状态时出错:', error)
        return new Response(JSON.stringify({ error: '记录协议接受状态失败', message: error.message }), {
          status: 500,
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      }
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/reject-agreement')) {
    // 记录用户拒绝协议
    if (request.method === 'POST') {
      try {
        const requestBody = await request.json()
        const clientIP = requestBody.ip || request.headers.get('CF-Connecting-IP') || '未知IP'
        
        // 这里可以添加更多逻辑，例如记录哪些IP拒绝了协议
        console.log(`用户 ${clientIP} 拒绝了协议`)
        
        return new Response(JSON.stringify({ 
          message: '协议拒绝已记录',
          ip: clientIP,
          status: 'rejected'
        }), {
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      } catch (error) {
        console.error('记录协议拒绝状态时出错:', error)
        return new Response(JSON.stringify({ error: '记录协议拒绝状态失败', message: error.message }), {
          status: 500,
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      }
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/send-email')) {
    // 处理邮件发送请求
    if (request.method === 'POST') {
      const requestBody = await request.json()
      const subject = requestBody.subject
      const content = requestBody.content
      
      // 这里应该添加实际的邮件发送逻辑
      // 由于Cloudflare Workers不直接支持SMTP，可能需要调用第三方API
      
      // 模拟邮件发送成功
      return new Response(JSON.stringify({ message: '邮件已发送！' }), {
        headers: { 
          'content-type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      })
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/clear-data') && url.searchParams.get('key') === 'admin123') {
    // 清除所有数据（需要密钥）
    suggestions = []
    ipList = []
    agreementPendingIPs = []
    await saveSuggestionsToKV()
    await saveIPListToKV()
    await saveAgreementPendingIPsToKV()
    
    return new Response(JSON.stringify({ message: '所有数据已清除' }), {
      headers: { 
        'content-type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    })
  } else if (url.pathname.startsWith('/debug-status')) {
    // 返回服务器状态信息，用于调试
    const status = {
      suggestions: {
        isArray: Array.isArray(suggestions),
        length: Array.isArray(suggestions) ? suggestions.length : 'not an array',
        sample: Array.isArray(suggestions) && suggestions.length > 0 ? 
          [suggestions[0], suggestions.length > 1 ? suggestions[1] : null].filter(Boolean) : []
      },
      ipList: {
        isArray: Array.isArray(ipList),
        length: Array.isArray(ipList) ? ipList.length : 'not an array',
        sample: Array.isArray(ipList) ? ipList.slice(0, 5) : []
      },
      agreementPendingIPs: {
        isArray: Array.isArray(agreementPendingIPs),
        length: Array.isArray(agreementPendingIPs) ? agreementPendingIPs.length : 'not an array',
        sample: Array.isArray(agreementPendingIPs) ? agreementPendingIPs.slice(0, 5) : []
      },
      timestamp: new Date().toISOString(),
      url: request.url
    }
    
    return new Response(JSON.stringify(status, null, 2), {
      headers: { 
        'content-type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    })
  } else if (url.pathname.startsWith('/get-client-ip')) {
    // 返回客户端IP地址
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    request.headers.get('X-Real-IP') ||
                    '未知IP';
    
    // 自动记录IP到列表中
    if (clientIP !== '未知IP' && !ipList.includes(clientIP)) {
      ipList.push(clientIP);
      // 异步保存，不等待完成
      saveIPListToKV().catch(err => console.error('保存IP列表失败:', err));
    }
    
    return new Response(JSON.stringify({ 
      ip: clientIP,
      headers: {
        'CF-Connecting-IP': request.headers.get('CF-Connecting-IP'),
        'X-Forwarded-For': request.headers.get('X-Forwarded-For'),
        'X-Real-IP': request.headers.get('X-Real-IP')
      }
    }), {
      headers: { 
        'content-type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    });
  } else if (url.pathname.startsWith('/reply-message')) {
    // 处理回复留言请求
    if (request.method === 'POST') {
      try {
        const requestBody = await request.json()
        const messageId = requestBody.messageId
        const replyContent = requestBody.replyContent
        
        if (!messageId || !replyContent) {
          throw new Error('缺少必要参数：messageId或replyContent')
        }
        
        // 查找对应的留言
        const messageIndex = suggestions.findIndex(msg => msg.timestamp === messageId)
        
        if (messageIndex === -1) {
          return new Response(JSON.stringify({ 
            error: '留言不存在', 
            message: '找不到指定ID的留言' 
          }), {
            status: 404,
            headers: { 
              'content-type': 'application/json;charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
          })
        }
        
        // 添加回复到留言中
        if (!suggestions[messageIndex].replies) {
          suggestions[messageIndex].replies = []
        }
        
        suggestions[messageIndex].replies.push({
          content: replyContent,
          timestamp: new Date().toISOString()
        })
        
        // 保存到KV存储
        await saveSuggestionsToKV()
        
        return new Response(JSON.stringify({ 
          message: '回复已添加',
          messageId: messageId,
          reply: suggestions[messageIndex].replies[suggestions[messageIndex].replies.length - 1]
        }), {
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      } catch (error) {
        console.error('添加回复时出错:', error)
        return new Response(JSON.stringify({ error: '添加回复失败', message: error.message }), {
          status: 400,
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      }
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else if (url.pathname.startsWith('/delete-message')) {
    // 处理删除留言请求
    if (request.method === 'POST') {
      try {
        const requestBody = await request.json()
        const messageId = requestBody.messageId
        
        if (!messageId) {
          throw new Error('缺少必要参数：messageId')
        }
        
        // 查找对应的留言
        const initialLength = suggestions.length
        suggestions = suggestions.filter(msg => msg.timestamp !== messageId)
        
        // 如果留言列表有变化，保存到KV
        if (initialLength !== suggestions.length) {
          await saveSuggestionsToKV()
          return new Response(JSON.stringify({ 
            message: '留言已删除',
            deleted: true,
            messageId: messageId,
            remainingCount: suggestions.length
          }), {
            headers: { 
              'content-type': 'application/json;charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
          })
        } else {
          // 留言不存在
          return new Response(JSON.stringify({ 
            error: '留言不存在', 
            message: '找不到指定ID的留言',
            deleted: false,
            messageId: messageId
          }), {
            status: 404,
            headers: { 
              'content-type': 'application/json;charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
          })
        }
      } catch (error) {
        console.error('删除留言时出错:', error)
        return new Response(JSON.stringify({ error: '删除留言失败', message: error.message }), {
          status: 400,
          headers: { 
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
        })
      }
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else {
    // 代理其他请求到 GitHub Pages
    url.hostname = 'LeonIncoffice.github.io'
    url.pathname = '/Leonweb' + url.pathname
    return fetch(url.toString(), request)
  }
}