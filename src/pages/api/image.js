export default async function imageProxy(req, res) {
  const url = req.query.url
  console.log({ url })
  // res.end()
  const path = req.url.replace("/api", "");
  const apiRes = await fetch(url, { method: req.method });
  const buf = await apiRes.arrayBuffer()
  res.write(Buffer.from(buf));
  res.end()
}