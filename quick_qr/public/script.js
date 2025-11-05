// Wizard State Management
let currentStep = 1;
let wizardData = {
  url: '',
  qrColor: '#0A0F1A',
  bgColor: '#E0F7FF',
  size: 256,
  frameStyle: 'none',
  logo: null,
  baseQrImage: null
};

// DOM Elements
const qrInput = document.getElementById('qrInput');
const qrColor = document.getElementById('qrColor');
const qrColorText = document.getElementById('qrColorText');
const qrColorPreview = document.getElementById('qrColorPreview');
const bgColor = document.getElementById('bgColor');
const bgColorText = document.getElementById('bgColorText');
const bgColorPreview = document.getElementById('bgColorPreview');
const qrSize = document.getElementById('qrSize');
const logoUpload = document.getElementById('logoUpload');
const logoPreview = document.getElementById('logoPreview');
const logoPreviewImg = document.getElementById('logoPreviewImg');
const removeLogo = document.getElementById('removeLogo');
const logoUploadText = document.querySelector('.logo-upload-text');
const qrPreviewCanvas = document.getElementById('qrPreviewCanvas');
const finalQrCanvas = document.getElementById('finalQrCanvas');
const qrPlaceholder = document.getElementById('qrPlaceholder');
const previewPlaceholderText = document.getElementById('previewPlaceholderText');
const qrData = document.getElementById('qrData');
const statusMessage = document.getElementById('statusMessage');
const historyCard = document.getElementById('historyCard');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const clearAllBtn = document.getElementById('clearAllBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const saveToHistoryBtn = document.getElementById('saveToHistoryBtn');

// Step elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const stepItems = document.querySelectorAll('.step-item');
const frameOptions = document.querySelectorAll('.frame-option');

// Navigation buttons
const step1Next = document.getElementById('step1Next');
const step2Back = document.getElementById('step2Back');
const step2Next = document.getElementById('step2Next');
const createNewBtn = document.getElementById('createNewBtn');

// Store QR codes in history
let qrHistory = [];

// Initialize: Load history from localStorage
function loadHistory() {
  const stored = localStorage.getItem('qrHistory');
  if (stored) {
    try {
      qrHistory = JSON.parse(stored);
      if (qrHistory.length > 0) {
        historyCard.style.display = 'block';
        historyEmpty.style.display = 'none';
        qrHistory.forEach(item => {
          addHistoryItem(item.data, item.qrImage, item.timestamp);
        });
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }
}

// Save history to localStorage
function saveHistory() {
  try {
    localStorage.setItem('qrHistory', JSON.stringify(qrHistory));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

// Show status message (accessible alternative to alert)
function showStatus(message, type = 'success', duration = 3000) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.add('show');
  
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, duration);
}

// Wizard Navigation
function goToStep(step) {
  // Hide all steps
  step1.classList.remove('active');
  step2.classList.remove('active');
  step3.classList.remove('active');
  step1.setAttribute('aria-hidden', 'true');
  step2.setAttribute('aria-hidden', 'true');
  step3.setAttribute('aria-hidden', 'true');

  // Update step indicators
  stepItems.forEach((item, index) => {
    const stepNum = index + 1;
    item.classList.remove('active', 'completed');
    if (stepNum < step) {
      item.classList.add('completed');
    } else if (stepNum === step) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'step');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  // Show current step
  const currentStepEl = document.getElementById(`step${step}`);
  if (currentStepEl) {
    currentStepEl.classList.add('active');
    currentStepEl.setAttribute('aria-hidden', 'false');
    currentStep = step;
    
    // Focus management for accessibility
    const firstFocusable = currentStepEl.querySelector('input, button, select, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }

  // Update preview if on step 2
  if (step === 2 && wizardData.baseQrImage) {
    updatePreview();
  }
}

// Sync color picker with text input
function syncColorInputs(colorInput, textInput, preview) {
  colorInput.addEventListener('input', async () => {
    const value = colorInput.value.toUpperCase();
    textInput.value = value;
    wizardData[colorInput.id === 'qrColor' ? 'qrColor' : 'bgColor'] = value;
    if (preview) preview.style.backgroundColor = value;
    if (currentStep === 2 && wizardData.baseQrImage) {
      // Regenerate base QR with new colors
      await regenerateBaseQR();
      updatePreview();
    }
  });

  textInput.addEventListener('input', async () => {
    const value = textInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      colorInput.value = value;
      wizardData[textInput.id === 'qrColorText' ? 'qrColor' : 'bgColor'] = value;
      if (preview) preview.style.backgroundColor = value;
      if (currentStep === 2 && wizardData.baseQrImage) {
        // Regenerate base QR with new colors
        await regenerateBaseQR();
        updatePreview();
      }
    }
  });

  textInput.addEventListener('blur', async () => {
    const value = textInput.value.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const validValue = colorInput.value.toUpperCase();
      textInput.value = validValue;
      wizardData[textInput.id === 'qrColorText' ? 'qrColor' : 'bgColor'] = validValue;
      if (preview) preview.style.backgroundColor = validValue;
      showStatus('Invalid color format. Using default.', 'error', 2000);
    } else if (currentStep === 2 && wizardData.baseQrImage) {
      // Regenerate if valid color on step 2
      await regenerateBaseQR();
      updatePreview();
    }
  });
}

// Regenerate base QR code with current colors (for preview updates)
async function regenerateBaseQR() {
  if (!wizardData.url) return;
  
  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: wizardData.url,
        qrColor: wizardData.qrColor,
        bgColor: wizardData.bgColor,
        qrSize: wizardData.size
      })
    });

    if (response.ok) {
      const { qrImage } = await response.json();
      wizardData.baseQrImage = qrImage;
    }
  } catch (err) {
    console.error('Failed to regenerate QR code:', err);
  }
}

// Initialize color sync
syncColorInputs(qrColor, qrColorText, qrColorPreview);
syncColorInputs(bgColor, bgColorText, bgColorPreview);

// Step 1: Generate base QR code
async function generateBaseQR() {
  const input = qrInput.value.trim();
  
  if (!input) {
    showStatus('Please enter some text or URL', 'error');
    qrInput.focus();
    return false;
  }

  wizardData.url = input;
  step1Next.disabled = true;
  step1Next.textContent = 'Generating...';
  step1Next.setAttribute('aria-busy', 'true');

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: input,
        qrColor: wizardData.qrColor,
        bgColor: wizardData.bgColor,
        qrSize: wizardData.size
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate QR code');
    }

    const { qrImage } = await response.json();
    wizardData.baseQrImage = qrImage;
    showStatus('QR code generated. Proceed to design step.', 'success');
    return true;
  } catch (err) {
    showStatus('Error generating QR code. Please try again.', 'error');
    console.error(err);
    return false;
  } finally {
    step1Next.disabled = false;
    step1Next.textContent = 'Next: Design';
    step1Next.setAttribute('aria-busy', 'false');
  }
}

// Step 2: Update preview with logo and frame
async function updatePreview() {
  if (!wizardData.baseQrImage) return;

  const canvas = qrPreviewCanvas;
  const ctx = canvas.getContext('2d');
  const size = wizardData.size;
  
  // Calculate dimensions based on frame
  let canvasWidth = size;
  let canvasHeight = size;
  let qrX = 0;
  let qrY = 0;
  let qrSize = size;
  let padding = 0;
  
  if (wizardData.frameStyle !== 'none') {
    padding = size * 0.1; // 10% padding
    canvasWidth = size + (padding * 2);
    canvasHeight = canvasWidth;
    qrX = padding;
    qrY = padding;
  }
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw frame background if needed
  if (wizardData.frameStyle !== 'none') {
    ctx.fillStyle = wizardData.bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  
  // Draw base QR code
  const qrImg = new Image();
  qrImg.crossOrigin = 'anonymous';
  
  qrImg.onload = () => {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    
    // Draw logo if exists
    if (wizardData.logo) {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        const logoSize = qrSize * 0.2; // 20% of QR size
        const logoX = qrX + (qrSize - logoSize) / 2;
        const logoY = qrY + (qrSize - logoSize) / 2;
        
        // Draw background for logo
        ctx.fillStyle = wizardData.bgColor;
        ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
        
        // Draw logo
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        
        drawFrameText(ctx, canvasWidth, canvasHeight, padding);
        canvas.style.display = 'block';
        qrPlaceholder.style.display = 'none';
        previewPlaceholderText.style.display = 'none';
      };
      logoImg.src = wizardData.logo;
    } else {
      drawFrameText(ctx, canvasWidth, canvasHeight, padding);
      canvas.style.display = 'block';
      qrPlaceholder.style.display = 'none';
      previewPlaceholderText.style.display = 'none';
    }
  };
  
  qrImg.src = wizardData.baseQrImage;
}

// Draw frame text
function drawFrameText(ctx, width, height, padding) {
  if (wizardData.frameStyle === 'none') return;
  
  ctx.fillStyle = wizardData.qrColor;
  const fontSize = Math.max(16, padding * 0.35);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let frameText = '';
  switch (wizardData.frameStyle) {
    case 'scan-me':
      frameText = 'Scan Me';
      break;
    case 'scan-to-visit':
      frameText = 'Scan to Visit';
      break;
    case 'scan-here':
      frameText = 'Scan Here';
      break;
  }
  
  if (frameText) {
    // Increased padding from 0.5 to 0.7 for better spacing from edges
    ctx.fillText(frameText, width / 2, padding * 0.7);
    ctx.fillText(frameText, width / 2, height - padding * 0.7);
  }
}

// Step 3: Generate final QR code
async function generateFinalQR() {
  if (!wizardData.baseQrImage) {
    showStatus('Please complete previous steps', 'error');
    goToStep(1);
    return;
  }

  const canvas = finalQrCanvas;
  const ctx = canvas.getContext('2d');
  const size = wizardData.size;
  
  // Calculate dimensions based on frame
  let canvasWidth = size;
  let canvasHeight = size;
  let qrX = 0;
  let qrY = 0;
  let qrSize = size;
  let padding = 0;
  
  if (wizardData.frameStyle !== 'none') {
    padding = size * 0.1; // 10% padding
    canvasWidth = size + (padding * 2);
    canvasHeight = canvasWidth;
    qrX = padding;
    qrY = padding;
  }
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw frame background if needed
  if (wizardData.frameStyle !== 'none') {
    ctx.fillStyle = wizardData.bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  
  // Draw base QR code
  const qrImg = new Image();
  qrImg.crossOrigin = 'anonymous';
  
  qrImg.onload = () => {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    
    // Draw logo if exists
    if (wizardData.logo) {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        const logoSize = qrSize * 0.2;
        const logoX = qrX + (qrSize - logoSize) / 2;
        const logoY = qrY + (qrSize - logoSize) / 2;
        
        // Draw background for logo
        ctx.fillStyle = wizardData.bgColor;
        ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
        
        // Draw logo
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        
        drawFrameTextFinal(ctx, canvasWidth, canvasHeight, padding);
        canvas.style.display = 'block';
      };
      logoImg.src = wizardData.logo;
    } else {
      drawFrameTextFinal(ctx, canvasWidth, canvasHeight, padding);
      canvas.style.display = 'block';
    }
  };
  
  qrImg.src = wizardData.baseQrImage;
  
  // Update QR data display
  qrData.textContent = `Data: ${wizardData.url}`;
}

// Draw frame text for final QR
function drawFrameTextFinal(ctx, width, height, padding) {
  if (wizardData.frameStyle === 'none') return;
  
  ctx.fillStyle = wizardData.qrColor;
  const fontSize = Math.max(16, padding * 0.35);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let frameText = '';
  switch (wizardData.frameStyle) {
    case 'scan-me':
      frameText = 'Scan Me';
      break;
    case 'scan-to-visit':
      frameText = 'Scan to Visit';
      break;
    case 'scan-here':
      frameText = 'Scan Here';
      break;
  }
  
  if (frameText) {
    // Increased padding from 0.5 to 0.7 for better spacing from edges
    ctx.fillText(frameText, width / 2, padding * 0.7);
    ctx.fillText(frameText, width / 2, height - padding * 0.7);
  }
}

// Event Listeners

// Step 1: Next button
step1Next.addEventListener('click', async () => {
  const success = await generateBaseQR();
  if (success) {
    goToStep(2);
  }
});

// Step 2: Back button
step2Back.addEventListener('click', () => {
  goToStep(1);
});

// Step 2: Size change
qrSize.addEventListener('change', async () => {
  wizardData.size = parseInt(qrSize.value);
  if (wizardData.baseQrImage && wizardData.url) {
    // Regenerate base QR with new size
    const success = await generateBaseQR();
    if (success) {
      updatePreview();
    } else {
      // Restore old values if generation failed
      wizardData.size = parseInt(qrSize.value);
      qrSize.value = wizardData.size;
    }
  }
});

// Step 2: Frame selection
frameOptions.forEach(option => {
  option.addEventListener('click', () => {
    frameOptions.forEach(opt => {
      opt.classList.remove('active');
      opt.setAttribute('aria-pressed', 'false');
    });
    option.classList.add('active');
    option.setAttribute('aria-pressed', 'true');
    wizardData.frameStyle = option.dataset.frame;
    document.getElementById('frameStyle').value = wizardData.frameStyle;
    updatePreview();
  });
  
  option.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      option.click();
    }
  });
});

// Step 2: Logo upload
logoUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    if (!file.type.startsWith('image/')) {
      showStatus('Please select an image file', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      wizardData.logo = event.target.result;
      logoPreviewImg.src = wizardData.logo;
      logoPreview.style.display = 'block';
      // Update button text
      if (logoUploadText) {
        logoUploadText.textContent = 'Change Logo Image';
      }
      updatePreview();
    };
    reader.readAsDataURL(file);
  }
});

// Remove logo
removeLogo.addEventListener('click', () => {
  wizardData.logo = null;
  logoUpload.value = '';
  logoPreview.style.display = 'none';
  // Update button text back to original
  if (logoUploadText) {
    logoUploadText.textContent = 'Choose Logo Image';
  }
  updatePreview();
});

// Step 2: Next button
step2Next.addEventListener('click', async () => {
  await generateFinalQR();
  goToStep(3);
});

// Step 3: Download
downloadBtn.addEventListener('click', () => {
  finalQrCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quickqr-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    showStatus('QR code downloaded successfully', 'success');
  });
});

// Step 3: Copy
copyBtn.addEventListener('click', async () => {
  try {
    finalQrCanvas.toBlob(async (blob) => {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      showStatus('QR code copied to clipboard', 'success');
    });
  } catch (err) {
    showStatus('Failed to copy QR code. Some browsers may not support this feature.', 'error');
    console.error(err);
  }
});

// Step 3: Save to history
saveToHistoryBtn.addEventListener('click', () => {
  finalQrCanvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.onload = () => {
      const qrImage = reader.result;
      const historyItem = {
        data: wizardData.url,
        qrImage,
        timestamp: Date.now()
      };
      qrHistory.unshift(historyItem);
      if (qrHistory.length > 50) {
        qrHistory = qrHistory.slice(0, 50);
      }
      saveHistory();
      addHistoryItem(wizardData.url, qrImage, Date.now());
      historyCard.style.display = 'block';
      historyEmpty.style.display = 'none';
      showStatus('QR code saved to history', 'success');
    };
    reader.readAsDataURL(blob);
  });
});

// Create new QR code
createNewBtn.addEventListener('click', () => {
  // Reset wizard data
  wizardData = {
    url: '',
    qrColor: '#0A0F1A',
    bgColor: '#E0F7FF',
    size: 256,
    frameStyle: 'none',
    logo: null,
    baseQrImage: null
  };
  
  // Reset form
  qrInput.value = '';
  qrColor.value = wizardData.qrColor;
  qrColorText.value = wizardData.qrColor;
  qrColorPreview.style.backgroundColor = wizardData.qrColor;
  bgColor.value = wizardData.bgColor;
  bgColorText.value = wizardData.bgColor;
  bgColorPreview.style.backgroundColor = wizardData.bgColor;
  qrSize.value = wizardData.size;
  logoUpload.value = '';
  logoPreview.style.display = 'none';
  
  // Reset frame selection
  frameOptions.forEach(opt => {
    opt.classList.remove('active');
    opt.setAttribute('aria-pressed', 'false');
  });
  frameOptions[0].classList.add('active');
  frameOptions[0].setAttribute('aria-pressed', 'true');
  
  // Reset canvases
  qrPreviewCanvas.style.display = 'none';
  finalQrCanvas.style.display = 'none';
  qrPlaceholder.style.display = 'flex';
  previewPlaceholderText.style.display = 'block';
  qrData.textContent = '';
  
  goToStep(1);
});

// Add history item to DOM
function addHistoryItem(data, qrImage, timestamp) {
  const historyItem = document.createElement('div');
  historyItem.classList.add('history-item');
  historyItem.setAttribute('role', 'listitem');
  historyItem.setAttribute('tabindex', '0');
  historyItem.setAttribute('aria-label', `QR code for: ${data.length > 30 ? data.substring(0, 30) + '...' : data}`);
  
  const truncatedData = data.length > 20 ? data.substring(0, 20) + '...' : data;
  
  historyItem.innerHTML = `
    <img src="${qrImage}" alt="QR code for ${truncatedData}">
    <p>${truncatedData}</p>
  `;

  // Click handler to restore QR code
  const restoreQR = () => {
    finalQrCanvas.width = 0;
    finalQrCanvas.height = 0;
    const img = new Image();
    img.onload = () => {
      finalQrCanvas.width = img.width;
      finalQrCanvas.height = img.height;
      const ctx = finalQrCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      finalQrCanvas.style.display = 'block';
      qrData.textContent = `Data: ${data}`;
      goToStep(3);
      showStatus('QR code restored from history', 'success');
    };
    img.src = qrImage;
  };

  historyItem.addEventListener('click', restoreQR);
  historyItem.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      restoreQR();
    }
  });

  historyList.insertBefore(historyItem, historyList.firstChild);

  // Animate reveal
  requestAnimationFrame(() => {
    setTimeout(() => {
      historyItem.classList.add('show');
    }, 50);
  });
}

// Clear all history
clearAllBtn.addEventListener('click', () => {
  const message = 'Are you sure you want to clear all QR code history? This action cannot be undone.';
  showStatus(message, 'error', 5000);
  
  if (confirm(message)) {
    qrHistory = [];
    saveHistory();
    historyList.innerHTML = '';
    historyCard.style.display = 'none';
    historyEmpty.style.display = 'block';
    showStatus('History cleared successfully', 'success');
  }
});

// Enter key support on input
qrInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && currentStep === 1) {
    e.preventDefault();
    step1Next.click();
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  qrInput.focus();
});

// Announce page load to screen readers
window.addEventListener('load', () => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = 'QuickQR wizard loaded. Step 1 of 3: Add URL or data.';
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
});