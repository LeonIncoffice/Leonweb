// 管理员可在此处修改投资数据
// 如果希望在 HTML 中单独维护数据，可在页面的 <script> 标签中
// 定义 window.weaponInvestments 和 window.itemInvestments 变量，
// 本脚本会自动读取这些值。未定义时将使用下面的默认列表
const weaponInvestments = window.weaponInvestments || [
    {
        id: 'W001',
        name: 'M416',
        price: '¥500',
        seller: '商家A',
        image: 'pathtoyourimage1.png',
        index: [100, 105, 102, 110, 120]
    },
    {
        id: 'W002',
        name: 'AKM',
        price: '¥450',
        seller: '商家B',
        image: 'pathtoyourimage2.png',
        index: [90, 92, 95, 99, 105]
    }
];

// 变卖物投资列表
// 如果页面中提供 window.itemInvestments，下面的数组会被覆盖
const itemInvestments = window.itemInvestments || [
    {
        id: 'I001',
        name: '三级头盔',
        price: '¥80',
        seller: '商家C',
        image: 'pathtoyourimage1.png',
        index: [50, 55, 53, 60, 65]
    },
    {
        id: 'I002',
        name: '防弹衣',
        price: '¥120',
        seller: '商家D',
        image: 'pathtoyourimage2.png',
        index: [60, 62, 66, 70, 72]
    }
];

function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';

    const idLabel = document.createElement('div');
    idLabel.className = 'id-label';
    idLabel.textContent = item.id;

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;

    const title = document.createElement('h3');
    title.textContent = item.name;

    const price = document.createElement('p');
    price.textContent = '价格: ' + item.price;

    const seller = document.createElement('p');
    seller.textContent = '发货商家: ' + item.seller;

    const canvas = document.createElement('canvas');
    canvas.className = 'chart';

    card.appendChild(idLabel);
    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(seller);
    card.appendChild(canvas);
    return card;
}

function drawLineChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const margin = 5; // 留一点边距绘制坐标轴

    ctx.clearRect(0, 0, width, height);

    // 绘制坐标轴（第一象限）
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // 绘制折线图
    ctx.beginPath();
    data.forEach((val, i) => {
        const x = margin + (i / (data.length - 1)) * (width - 2 * margin);
        const y = height - margin - ((val - min) / (max - min)) * (height - 2 * margin);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.strokeStyle = '#007bff';
    ctx.stroke();
}

function renderWeapons(list) {
    const container = document.getElementById('weaponContainer');
    container.innerHTML = '';
    list.forEach(item => {
        const card = createCard(item);
        container.appendChild(card);
        const canvas = card.querySelector('canvas');
        drawLineChart(canvas, item.index);
    });
}

function renderItems(list) {
    const container = document.getElementById('itemContainer');
    container.innerHTML = '';
    list.forEach(item => {
        const card = createCard(item);
        container.appendChild(card);
        const canvas = card.querySelector('canvas');
        drawLineChart(canvas, item.index);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    renderWeapons(weaponInvestments);
    renderItems(itemInvestments);

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim().toLowerCase();
        // 根据投资号同时过滤枪械和变卖物
        const filteredWeapons = weaponInvestments.filter(w => w.id.toLowerCase().includes(term));
        const filteredItems = itemInvestments.filter(i => i.id.toLowerCase().includes(term));
        renderWeapons(filteredWeapons);
        renderItems(filteredItems);
    });
});
