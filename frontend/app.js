// API 配置
const API_BASE_URL = 'http://localhost:3000';

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeBtn = document.getElementById('removeBtn');
const identifyBtn = document.getElementById('identifyBtn');
const resultSection = document.getElementById('resultSection');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const resetBtn = document.getElementById('resetBtn');

// 结果展示元素
const metalTypeEl = document.getElementById('metalType');
const confidenceEl = document.getElementById('confidence');
const metalTypeEnEl = document.getElementById('metalTypeEn');
const confidenceValueEl = document.getElementById('confidenceValue');
const impuritiesEl = document.getElementById('impurities');
const timestampEl = document.getElementById('timestamp');

// 当前选中的文件
let selectedFile = null;

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
    if (!file || !file.type.startsWith('image/')) {
        showError('请选择图片文件');
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
        uploadPlaceholder.style.display = 'none';
        imagePreview.style.display = 'inline-block';
        identifyBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

// 移除图片
removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUpload();
});

// 重置上传
function resetUpload() {
    selectedFile = null;
    imageInput.value = '';
    uploadPlaceholder.style.display = 'block';
    imagePreview.style.display = 'none';
    identifyBtn.disabled = true;
    previewImg.src = '';
}

// 开始识别
identifyBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showError('请先选择图片');
        return;
    }
    
    // 显示加载状态
    showLoading();
    
    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        const response = await fetch(`${API_BASE_URL}/api/identify`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult(result.data);
        } else {
            showError(result.error || '识别失败');
        }
    } catch (error) {
        console.error('识别错误:', error);
        showError('网络错误，请检查后端服务是否启动');
    }
});

// 显示结果
function showResult(data) {
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultSection.style.display = 'block';
    
    metalTypeEl.textContent = data.metalType;
    confidenceEl.textContent = `${(data.confidence * 100).toFixed(0)}%`;
    metalTypeEnEl.textContent = data.metalTypeEn || '--';
    confidenceValueEl.textContent = `${(data.confidence * 100).toFixed(1)}%`;
    impuritiesEl.textContent = data.impurities && data.impurities.length > 0 
        ? data.impurities.join(', ') 
        : '无';
    timestampEl.textContent = new Date(data.timestamp).toLocaleString('zh-CN');
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
    errorMessage.textContent = message;
}

// 重新识别
resetBtn.addEventListener('click', () => {
    resultSection.style.display = 'none';
    resetUpload();
});

// 页面加载完成
console.log('Ecobridge AI 前端已加载');
console.log('后端 API 地址:', API_BASE_URL);
