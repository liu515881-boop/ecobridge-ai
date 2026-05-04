// 多语言翻译文件
const translations = {
    zh: {
        nav_identify: '识别',
        nav_history: '历史记录',
        nav_about: '关于',
        title_identify: '金属识别',
        subtitle_identify: '上传废金属照片，AI 自动识别金属类型和杂质含量',
        upload_click: '点击或拖拽图片到此处',
        upload_hint: '支持 JPG、PNG 格式，最大 10MB',
        loading_text: '正在分析图片，请稍候...',
        error_message: '识别失败，请重试',
        report_title: '识别报告',
        confidence_label: '置信度',
        impurities_label: '杂质检测',
        reason_label: '判断依据',
        timestamp_label: '识别时间',
        btn_reset: '重新识别',
        btn_report: '生成报告',
        metal_copper: '铜',
        metal_aluminum: '铝',
        metal_iron: '铁',
        metal_stainless: '不锈钢',
        metal_other: '其他',
        no_impurities: '无杂质'
    },
    en: {
        nav_identify: 'Identify',
        nav_history: 'History',
        nav_about: 'About',
        title_identify: 'Metal Identification',
        subtitle_identify: 'Upload scrap metal photo, AI automatically identifies metal type and impurities',
        upload_click: 'Click or drag image here',
        upload_hint: 'Supports JPG, PNG format, max 10MB',
        loading_text: 'Analyzing image, please wait...',
        error_message: 'Identification failed, please try again',
        report_title: 'Identification Report',
        confidence_label: 'Confidence',
        impurities_label: 'Impurities Detected',
        reason_label: 'Reasoning',
        timestamp_label: 'Timestamp',
        btn_reset: 'Reset',
        btn_report: 'Generate Report',
        metal_copper: 'Copper',
        metal_aluminum: 'Aluminum',
        metal_iron: 'Iron',
        metal_stainless: 'Stainless Steel',
        metal_other: 'Other',
        no_impurities: 'None'
    },
    ar: {
        nav_identify: 'تعرف',
        nav_history: 'السجل',
        nav_about: 'حول',
        title_identify: 'تعرف على المعادن',
        subtitle_identify: 'قم بتحميل صورة للخردة المعدنية، الذكاء الاصطناعي يتعرف تلقائياً على نوع المعدن والشوائب',
        upload_click: 'انقر أو اسحب الصورة إلى هنا',
        upload_hint: 'يدعم صيغ JPG و PNG، الحد الأقصى 10 ميجابايت',
        loading_text: 'جاري تحليل الصورة، يرجى الانتظار...',
        error_message: 'فشل التعرف، يرجى المحاولة مرة أخرى',
        report_title: 'تقرير التعرف',
        confidence_label: 'الثقة',
        impurities_label: 'الشوائب المكتشفة',
        reason_label: 'السبب',
        timestamp_label: 'الوقت',
        btn_reset: 'إعادة تعيين',
        btn_report: 'إنشاء تقرير',
        metal_copper: 'نحاس',
        metal_aluminum: 'ألومنيوم',
        metal_iron: 'حديد',
        metal_stainless: 'فولاذ مقاوم للصدأ',
        metal_other: 'آخر',
        no_impurities: 'لا يوجد'
    },
    hi: {
        nav_identify: 'पहचानें',
        nav_history: 'इतिहास',
        nav_about: 'के बारे में',
        title_identify: 'धातु पहचान',
        subtitle_identify: 'स्क्रैप धातु की तस्वीर अपलोड करें, AI स्वचालित रूप से धातु के प्रकार और अशुद्धियों की पहचान करता है',
        upload_click: 'यहाँ छवि पर क्लिक करें या खींचें',
        upload_hint: 'JPG, PNG प्रारूप का समर्थन करता है, अधिकतम 10MB',
        loading_text: 'छवि का विश्लेषण किया जा रहा है, कृपया प्रतीक्षा करें...',
        error_message: 'पहचान विफल, कृपया पुनः प्रयास करें',
        report_title: 'पहचान रिपोर्ट',
        confidence_label: 'विश्वास',
        impurities_label: 'अशुद्धियाँ',
        reason_label: 'कारण',
        timestamp_label: 'समय',
        btn_reset: 'रीसेट',
        btn_report: 'रिपोर्ट जनरेट करें',
        metal_copper: 'तांबा',
        metal_aluminum: 'एल्यूमीनियम',
        metal_iron: 'लोहा',
        metal_stainless: 'स्टेनलेस स्टील',
        metal_other: 'अन्य',
        no_impurities: 'कोई नहीं'
    },
    ur: {
        nav_identify: 'پہچان',
        nav_history: 'تاریخ',
        nav_about: 'کے بارے میں',
        title_identify: 'دھات کی پہچان',
        subtitle_identify: 'سکریپ دھات کی تصویر اپ لوڈ کریں، AI خودکار طور پر دھات کی قسم اور ملاوٹ کی پہچان کرتا ہے',
        upload_click: 'یہاں تصویر پر کلک کریں یا کھینچیں',
        upload_hint: 'JPG، PNG فارمیٹ کو سپورٹ کرتا ہے، زیادہ سے زیادہ 10MB',
        loading_text: 'تصویر کا تجزیہ کیا جا رہا ہے، براہ کرم انتظار کریں...',
        error_message: 'پہچان ناکام، براہ کرم دوبارہ کوشش کریں',
        report_title: 'پہچان رپورٹ',
        confidence_label: 'اعتماد',
        impurities_label: 'ملاوٹ',
        reason_label: 'وجہ',
        timestamp_label: 'وقت',
        btn_reset: 'ری سیٹ',
        btn_report: 'رپورٹ بنائیں',
        metal_copper: 'تانبا',
        metal_aluminum: 'ایلومینیم',
        metal_iron: 'لوہا',
        metal_stainless: 'سٹینلیس سٹیل',
        metal_other: 'دیگر',
        no_impurities: 'کوئی نہیں'
    }
};

// 当前语言
let currentLang = 'zh';

// 切换语言
function changeLanguage() {
    const select = document.getElementById('languageSelect');
    currentLang = select.value;
    
    // 保存语言选择到 localStorage
    localStorage.setItem('ecobridge_lang', currentLang);
    
    // 更新所有文本
    updateTexts();
    
    // 从右到左语言（阿拉伯语、乌尔都语）
    if (currentLang === 'ar' || currentLang === 'ur') {
        document.body.dir = 'rtl';
    } else {
        document.body.dir = 'ltr';
    }
}

// 更新文本
function updateTexts() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
    
    // 更新标题
    document.title = `Ecobridge AI - ${translations[currentLang].title_identify}`;
}

// 获取翻译文本
function t(key) {
    return translations[currentLang][key] || key;
}

// 页面加载时恢复语言选择
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('ecobridge_lang') || 'zh';
    document.getElementById('languageSelect').value = savedLang;
    currentLang = savedLang;
    updateTexts();
    
    if (currentLang === 'ar' || currentLang === 'ur') {
        document.body.dir = 'rtl';
    }
});

// 导出函数供 app.js 使用
window.t = t;
window.currentLang = currentLang;
window.translations = translations;
