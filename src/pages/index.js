import { useEffect, useState } from "react";
import * as _Jimp from "jimp";
const Jimp = typeof self !== "undefined" ? self.Jimp || _Jimp : _Jimp;

const COLS = 800;
const ROWS = 1198;
const THRESHOLD = 2500000000; // RGBA value in int form

let src = null;

export default function Home() {
  const [img, setImg] = useState(null);
  const [err, setErr] = useState(null);
  // set up handler:
  useEffect(() => {
    document.addEventListener("paste", (event) => {
      const items = (event.clipboardData || window.clipboardData).items;
      let blob;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") === 0) {
          blob = items[i].getAsFile();
        }
      }

      if (blob !== null) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const jimpImg = await Jimp.read(e.target.result);
          const resizedImg = await jimpImg.contain(COLS, ROWS).grayscale();
          const base64Img = await resizedImg.getBase64Async(Jimp.MIME_PNG);

          const bitImg = new Buffer.alloc((COLS / 8) * ROWS);
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
          fetch("/api/print", {
            method: "POST",
            body: bitImg.toString("base64"),
          });
          setImg(base64Img);
          setErr(null);
        };
        try {
          reader.readAsDataURL(blob);
        } catch (e) {
          setErr(e.message);
        }
      }
    });
  }, []);

  return (
    <main className="h-screen">
      <div className="headernav bg-bg-app border-b pt-4 mb-6">
        <nav className="container mx-auto mb-4 md:mb-6 flex align-center">
          <div>
            <h2 className="text-lg font-semibold">Paste & Print</h2>
            <p>Paste an image to print it</p>
          </div>
          <div className="ml-5">
            <h2>My copied image is:</h2>
            <div className="">
              <label htmlFor="portrait">
                <input
                  id="portrait"
                  type="radio"
                  value="portrait"
                  name="orientation"
                  className="mr-1"
                />
                Portrait
              </label>
            </div>
            <div>
              <label htmlFor="default-radio-2">
                <input
                  defaultChecked
                  id="landscape"
                  type="radio"
                  value="landscape"
                  name="orientation"
                  className="mr-1"
                />
                Landscape
              </label>
            </div>
          </div>
        </nav>
      </div>
      <section className="container flex mx-auto mb-4 md:mb-6 flex align-center h-5/6">
        {err ? (
          <p>Paste an image, not a novel! 📷😄</p>
        ) : (
          img && <img className="h-full rounded-sm border" src={img} />
        )}
      </section>
    </main>
  );
}
