document.getElementById("generateBtn").addEventListener("click", async () => {
  const input = document.getElementById("qrInput").value;
  const qrColor = document.getElementById("qrColor").value;
  const bgColor = document.getElementById("bgColor").value;
  const qrSize = document.getElementById("qrSize").value;
  const outputCard = document.getElementById("outputCard");
  const qrImg = document.getElementById("qrCode");
  const qrData = document.getElementById("qrData");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const historyCard = document.getElementById("historyCard");
  const historyList = document.getElementById("historyList");

  if (!input.trim()) {
    alert("❗ Please enter some text or URL!");
    return;
  }

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: input, qrColor, bgColor, qrSize })
    });

    const { qrImage } = await res.json();
    qrImg.src = qrImage;
    qrData.textContent = `Data: ${input}`;
    outputCard.style.display = "block";
    downloadBtn.style.display = "inline-block";
    copyBtn.style.display = "inline-block";

    // Enable download
    downloadBtn.onclick = () => {
      const link = document.createElement("a");
      link.href = qrImage;
      link.download = "quickqr.png";
      link.click();
    };

    // Enable copy as image
    copyBtn.onclick = async () => {
      try {
        const response = await fetch(qrImage);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        alert("✅ QR code copied to clipboard! Now you can paste it.");
      } catch (err) {
        alert("⚠️ Failed to copy QR code. Some browsers may not support this feature.");
        console.error(err);
      }
    };

    // Add to history
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");
    historyItem.innerHTML = `
      <img src="${qrImage}" alt="QR Code">
      <p>${input.length > 20 ? input.substring(0, 20) + "..." : input}</p>
    `;
    historyList.prepend(historyItem);
    historyCard.style.display = "block";
  } catch (err) {
    alert("⚠️ Error generating QR code!");
  }
});
