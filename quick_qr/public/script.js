// DOM Elements
const qrInput = document.getElementById('qrInput');
const qrColor = document.getElementById('qrColor');
const qrColorText = document.getElementById('qrColorText');
const qrColorPreview = document.getElementById('qrColorPreview');
const bgColor = document.getElementById('bgColor');
const bgColorText = document.getElementById('bgColorText');
const bgColorPreview = document.getElementById('bgColorPreview');
const qrSize = document.getElementById('qrSize');
const generateBtn = document.getElementById('generateBtn');
const qrCode = document.getElementById('qrCode');
const qrPlaceholder = document.getElementById('qrPlaceholder');
const placeholderText = document.getElementById('placeholderText');
const qrPreviewContainer = document.getElementById('qrPreviewContainer');
const qrActions = document.getElementById('qrActions');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const qrData = document.getElementById('qrData');
const historyCard = document.getElementById('historyCard');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const clearAllBtn = document.getElementById('clearAllBtn');
const statusMessage = document.getElementById('statusMessage');

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
          addHistoryItem(item.data, item.qrImage, item.qrColor, item.bgColor, item.size);
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

// Sync color picker with text input
function syncColorInputs(colorInput, textInput, preview) {
  colorInput.addEventListener('input', () => {
    const value = colorInput.value.toUpperCase();
    textInput.value = value;
    if (preview) preview.style.backgroundColor = value;
  });

  textInput.addEventListener('input', () => {
    const value = textInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      colorInput.value = value;
      if (preview) preview.style.backgroundColor = value;
    }
  });

  textInput.addEventListener('blur', () => {
    const value = textInput.value.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      // Reset to color input value if invalid
      const validValue = colorInput.value.toUpperCase();
      textInput.value = validValue;
      if (preview) preview.style.backgroundColor = validValue;
      showStatus('Invalid color format. Using default.', 'error', 2000);
    }
  });
}

// Initialize color sync
syncColorInputs(qrColor, qrColorText, qrColorPreview);
syncColorInputs(bgColor, bgColorText, bgColorPreview);

// Generate QR Code
async function generateQRCode() {
  const input = qrInput.value.trim();
  const qrColorValue = qrColor.value;
  const bgColorValue = bgColor.value;
  const size = parseInt(qrSize.value);

  if (!input) {
    showStatus('Please enter some text or URL', 'error');
    qrInput.focus();
    return;
  }

  // Disable button during generation
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  generateBtn.setAttribute('aria-busy', 'true');

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: input,
        qrColor: qrColorValue,
        bgColor: bgColorValue,
        qrSize: size
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate QR code');
    }

    const { qrImage } = await response.json();

    // Display QR code
    qrCode.src = qrImage;
    qrCode.alt = `QR code for: ${input}`;
    qrCode.style.display = 'block';
    qrPlaceholder.style.display = 'none';
    placeholderText.style.display = 'none';
    qrActions.style.display = 'flex';
    qrData.textContent = `Data: ${input}`;
    qrData.style.display = 'block';

    // Setup download button
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = `quickqr-${Date.now()}.png`;
      link.click();
      showStatus('QR code downloaded successfully', 'success');
    };

    // Setup copy button
    copyBtn.onclick = async () => {
      try {
        const response = await fetch(qrImage);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        showStatus('QR code copied to clipboard', 'success');
      } catch (err) {
        showStatus('Failed to copy QR code. Some browsers may not support this feature.', 'error');
        console.error(err);
      }
    };

    // Add to history
    const historyItem = {
      data: input,
      qrImage,
      qrColor: qrColorValue,
      bgColor: bgColorValue,
      size,
      timestamp: Date.now()
    };
    qrHistory.unshift(historyItem);
    if (qrHistory.length > 50) {
      qrHistory = qrHistory.slice(0, 50); // Limit to 50 items
    }
    saveHistory();

    addHistoryItem(input, qrImage, qrColorValue, bgColorValue, size);
    historyCard.style.display = 'block';
    historyEmpty.style.display = 'none';

    showStatus('QR code generated successfully', 'success');
  } catch (err) {
    showStatus('Error generating QR code. Please try again.', 'error');
    console.error(err);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate QR Code';
    generateBtn.setAttribute('aria-busy', 'false');
  }
}

// Add history item to DOM
function addHistoryItem(data, qrImage, qrColorValue, bgColorValue, size) {
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
    qrCode.src = qrImage;
    qrCode.alt = `QR code for: ${data}`;
    qrCode.style.display = 'block';
    qrPlaceholder.style.display = 'none';
    placeholderText.style.display = 'none';
    qrActions.style.display = 'flex';
    qrData.textContent = `Data: ${data}`;
    qrData.style.display = 'block';

    // Scroll to preview
    qrCode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Setup download button
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = `quickqr-${Date.now()}.png`;
      link.click();
      showStatus('QR code downloaded successfully', 'success');
    };

    // Setup copy button
    copyBtn.onclick = async () => {
      try {
        const response = await fetch(qrImage);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        showStatus('QR code copied to clipboard', 'success');
      } catch (err) {
        showStatus('Failed to copy QR code', 'error');
        console.error(err);
      }
    };

    showStatus('QR code restored from history', 'success');
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
  // Use accessible confirmation
  const message = 'Are you sure you want to clear all QR code history? This action cannot be undone.';
  showStatus(message, 'error', 5000);
  
  // For better UX, we'll use a simple confirmation but announce it
  if (confirm(message)) {
    qrHistory = [];
    saveHistory();
    historyList.innerHTML = '';
    historyCard.style.display = 'none';
    historyEmpty.style.display = 'block';
    showStatus('History cleared successfully', 'success');
  }
});

// Generate button click
generateBtn.addEventListener('click', generateQRCode);

// Enter key support on input
qrInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    generateQRCode();
  }
});

// Keyboard navigation for form inputs
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter to generate
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generateQRCode();
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  qrInput.focus(); // Focus on input for better accessibility
});

// Announce page load to screen readers
window.addEventListener('load', () => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = 'QuickQR page loaded. Enter text or URL to generate a QR code.';
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
});