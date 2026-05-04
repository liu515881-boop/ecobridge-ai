// API 配置
const API_BASE_URL = 'http://localhost:3000';

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadContent = document.getElementById('uploadContent');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeBtn = document.getElementById('removeBtn');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const resultSection = document.getElementById('resultSection');
const resetBtn = document.getElementById('resetBtn');
const generateReportBtn = document.getElementById('generateReportBtn');

// 结果展示元素
const resultImg = document.getElementById('resultImg');
const metalBadge = document.getElementById('metalBadge');
const metalNameEn = document.getElementById('metalNameEn');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceValue = document.getElementById('confidenceValue');
const impuritiesList = document.getElementById('impuritiesList');
const reasonText = document.getElementById('reasonText');
const timestamp = document.getElementById('timestamp');

// 当前选中的文件
let selectedFile = null;

// 金属类型映射（用于样式）
const metalTypeMap = {
    '铜': { class: 'copper', en: 'Copper' },
    '铝': { class: 'aluminum', en: 'Aluminum' },
    '铁': { class: 'iron', en: 'Iron' },
    '不锈钢': { class: 'stainless', en: 'Stainless Steel' },
    '其他': { class: 'other', en: 'Other' }
};

// 点击上传区域
uploadArea.addEventListener('click', () => {
    imageInput.click();
});

// 文件选择
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
});

// 拖拽上传
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
});

// 处理文件选择
function handleFileSelect(file) {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showError('请选择图片文件（JPG 或 PNG）');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showError('图片大小不能超过 10MB');
        return;
    }
    
    selectedFile = file;
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadContent.style.display = 'none';
        imagePreview.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
    
    // 自动开始识别
    startIdentification();
}

// 移除图片
removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetAll();
});

// 重置所有状态
function resetAll() {
    selectedFile = null;
    imageInput.value = '';
    uploadContent.style.display = 'flex';
    imagePreview.style.display = 'none';
    previewImg.src = '';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// 开始识别
function startIdentification() {
    if (!selectedFile) {
        showError('请先选择图片');
        return;
    }
    
    // 显示加载状态
    showLoading();
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    
    fetch(`${API_BASE_URL}/api/identify`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showResult(result.data);
        } else {
            showError(result.error || '识别失败');
        }
    })
    .catch(error => {
        console.error('识别错误:', error);
        showError('网络错误，请检查后端服务是否启动');
    });
}

// 显示结果
function showResult(data) {
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    // 设置图片
    resultImg.src = data.imageUrl || previewImg.src;
    
    // 设置金属类型和样式
    const metalInfo = metalTypeMap[data.metalType] || metalTypeMap['其他'];
    metalBadge.textContent = data.metalType;
    metalBadge.className = 'metal-badge ' + metalInfo.class;
    metalNameEn.textContent = data.metalTypeEn || metalInfo.en;
    
    // 设置置信度
    const confidencePercent = Math.round((data.confidence || 0) * 100);
    confidenceFill.style.width = confidencePercent + '%';
    confidenceValue.textContent = confidencePercent + '%';
    
    // 设置杂质标签
    impuritiesList.innerHTML = '';
    if (data.impurities && data.impurities.length > 0) {
        data.impurities.forEach(impurity => {
            const tag = document.createElement('span');
            tag.className = 'impurity-tag';
            tag.textContent = impurity;
            impuritiesList.appendChild(tag);
        });
    } else {
        const tag = document.createElement('span');
        tag.className = 'impurity-tag none';
        tag.textContent = '无杂质';
        impuritiesList.appendChild(tag);
    }
    
    // 设置判断依据
    reasonText.textContent = data.reason || '--';
    
    // 设置识别时间
    if (data.timestamp) {
        timestamp.textContent = new Date(data.timestamp).toLocaleString('zh-CN');
    } else {
        timestamp.textContent = new Date().toLocaleString('zh-CN');
    }
    
    // 显示结果区域
    resultSection.style.display = 'block';
    
    // 滚动到结果区域
    setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// 显示加载
function showLoading() {
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    loadingSection.style.display = 'block';
}

// 显示错误
function showError(message) {
    loadingSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'block';
    errorMessage.textContent = message || t('error_message');
}

// 重新识别
resetBtn.addEventListener('click', () => {
    resetAll();
});

// 生成报告（占位功能）
generateReportBtn.addEventListener('click', () => {
    alert('生成报告功能开发中...\n\n未来将支持：\n- 导出 PDF 报告\n- 发送邮件\n- 打印报告');
});

// 页面加载完成
console.log('🌍 Ecobridge AI 前端已加载');
console.log('📡 后端 API 地址:', API_BASE_URL);
