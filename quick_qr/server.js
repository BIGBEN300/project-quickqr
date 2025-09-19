const express = require("express");
const QRCode = require("qrcode");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/generate", async (req, res) => {
  const { data, qrColor = "#000000", bgColor = "#ffffff", qrSize = 300 } = req.body;
  if (!data) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    const qrImage = await QRCode.toDataURL(data, {
      margin: 2,
      width: parseInt(qrSize),
      color: {
        dark: qrColor,
        light: bgColor
      }
    });
    res.json({ qrImage });
  } catch (err) {
    res.status(500).json({ error: "QR Code generation failed" });
  }
});


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
