import { useEffect, useState } from "react";
import * as _Jimp from "jimp";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/fontawesome-free-solid";
const Jimp = typeof self !== "undefined" ? self.Jimp || _Jimp : _Jimp;

const COLS = 800;
const ROWS = 1198;
const THRESHOLD = 2500000000; // RGBA value in int form

let src = null;
let bitImg = null;

export default function Home() {
  const [img, setImg] = useState(null);
  const [err, setErr] = useState(null);
  const [printOnPaste, setPrintOnPaste] = useState(true);

  async function resizeAndPrint(base64Data) {
    let jimpImg;
    try {
      jimpImg = await Jimp.read(base64Data);
    } catch (e) {
      setErr(
        "Failed to download image. Please check that your URL is publicly accessible, or copy / paste the image directly."
      );
      return;
    }

    // find the current width of jimp img
    if (jimpImg.getWidth() > jimpImg.getHeight()) {
      jimpImg.rotate(-90);
    }

    // Resize and contain the original image onto the white background
    const whiteBackground = await new Jimp(COLS, ROWS, 0xffffffff);
    let resizedImg = await jimpImg.contain(COLS, ROWS).grayscale();
    resizedImg = await whiteBackground.composite(resizedImg, 0, 0);

    const base64Img = await resizedImg.getBase64Async(Jimp.MIME_PNG);
    setErr(null);
    setImg(base64Img);

    bitImg = new Buffer.alloc((COLS / 8) * ROWS);
    for (let row = 0; row < ROWS; row++) {
      for (let byte = 0; byte < COLS / 8; byte++) {
        let byteData = 0;
        for (let bit = 0; bit < 8; bit++) {
          const pixelX = byte * 8 + bit;
          const pixelY = row;
          const val = resizedImg.getPixelColor(pixelX, pixelY);
          if (val > THRESHOLD) {
            byteData = byteData | (1 << (7 - bit));
          }
        }
        bitImg[row * (COLS / 8) + byte] = byteData;
      }
    }

    const printOnPaste = document.forms.controls.printOnPaste.checked;
    if (printOnPaste) {
      console.log("printing...");
      fetch("/api/print", {
        method: "POST",
        body: bitImg.toString("base64"),
      });
    }
  }
  async function handlePaste(event) {
    const items = (event.clipboardData || window.clipboardData).items;
    let blob = null;

    for (const item of items) {
      if (item.type.startsWith("image")) {
        blob = item.getAsFile();
      }
    }

    if (blob !== null) {
      handleBlob(blob);
      return;
    }

    // No blob found, now try text
    for (const item of items) {
      if (item.type.startsWith("text")) {
        item.getAsString(async (url) => {
          // check that url starts with http / https
          if (!url.match(/^https?:\/\//)) {
            setErr("Invalid URL");
            return;
          }
          src = url;
          // load from /api/image
          const res = await fetch(`/api/image?url=${src}`, {
            method: "GET",
          });
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => resizeAndPrint(reader.result);
          reader.readAsDataURL(blob);
        });
      }
    }
  }

  function handleBlob(blob) {
    const reader = new FileReader();
    reader.onload = (e) => resizeAndPrint(e.target.result);
    try {
      reader.readAsDataURL(blob);
    } catch (e) {
      setErr(e.message);
      return;
    }
  }

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return function cleanup() {
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  return (
    <main className="h-screen">
      <div className="headernav bg-bg-app border-b pt-4 mb-6">
        <nav className="container mx-auto mb-4 md:mb-6 flex justify-between">
          <div>
            <h2 className="text-lg font-semibold">Paste & Print</h2>
            <p>Paste an image to print it</p>
          </div>
          <div className="text-right">
            <form name="controls" className="mb-2">
              <label>
                Print immedialte after Paste
                <input
                  className="ml-2"
                  name="printOnPaste"
                  type="checkbox"
                  checked={printOnPaste}
                  onChange={(e) => setPrintOnPaste(e.target.checked)}
                />
              </label>
            </form>
            <div>
              {!printOnPaste && (
                <button
                  disabled={!img}
                  onClick={() =>
                    fetch("/api/print", {
                      method: "POST",
                      body: bitImg.toString("base64"),
                    })
                  }
                  title={img ? "Print" : "No image to print"}
                  className={
                    "ml-2 text-white font-bold py-2 px-4 rounded" +
                    (img
                      ? " bg-blue-500 hover:bg-blue-700"
                      : " bg-gray-500 hover:bg-gray-700 hover:cursor-not-allowed")
                  }
                >
                  <FontAwesomeIcon icon={faPrint} className="mr-2" />
                  Print
                </button>
              )}
              <button
                className={
                  "ml-2 py-2 px-4 rounded border " +
                  (img
                    ? "text-blue-500 border-blue-300 hover:bg-blue-300"
                    : "text-gray-500 border-gray-300 hover:bg-gray-300")
                }
                onClick={() => setImg(null)}
              >
                Clear
              </button>
            </div>
          </div>
        </nav>
      </div>
      <section className="container mx-auto mb-4 md:mb-6 h-5/6">
        {err ? (
          <code className="border border-red-400 rounded px-2 py-1 bg-red-200">
            {err}
          </code>
        ) : (
          img && <img className="h-full rounded-sm border" src={img} />
        )}
      </section>
    </main>
  );
}
