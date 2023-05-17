import fs from "fs";

export default function handler(req, res) {
  const label = Buffer.concat([
    Buffer.alloc(512), // 512 NUL bytes to start a new label
    Buffer.from("\r\nSIZE 99.8 mm, 149.9 mm"),
    Buffer.from("\r\nSET TEAR ON"),
    Buffer.from("\r\nSET CUTTER OFF"),
    Buffer.from("\r\nSET PEEL OFF"),
    Buffer.from("\r\nCLS"),
    Buffer.from("\r\nBITMAP 0,0,100,1198,1,"),
    Buffer.from(req.body, "base64"),
    Buffer.from("\r\nPRINT 1,1"),
    Buffer.from("\r\n"),
  ]);
  fs.writeFileSync("/dev/usb/lp0", label);
  res.status(200).json({ name: "John Doe" });
}
