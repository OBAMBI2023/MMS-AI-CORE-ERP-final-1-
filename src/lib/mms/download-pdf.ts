import type { jsPDF } from "jspdf";

type PdfDeliveryMethod = "download" | "share";

const isAndroid = () => /Android/i.test(navigator.userAgent);

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Chrome needs the object URL to remain valid while it hands the file to
  // the download manager.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/**
 * Delivers a jsPDF document without navigating to a blob URL.
 *
 * Chrome Android can reject blob URL downloads as insecure. On Android we
 * therefore hand the real PDF File to the native share sheet when supported.
 * Desktop browsers keep the conventional <a download> behaviour.
 */
export async function downloadPdf(doc: jsPDF, filename: string): Promise<PdfDeliveryMethod> {
  const generatedBlob = doc.output("blob");
  const pdfBlob = new Blob([generatedBlob], { type: "application/pdf" });
  const file = new File([pdfBlob], filename, {
    type: "application/pdf",
    lastModified: Date.now(),
  });

  if (isAndroid() && typeof navigator.share === "function") {
    const shareData: ShareData = {
      files: [file],
      title: filename,
    };

    if (typeof navigator.canShare !== "function" || navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return "share";
      } catch (error) {
        // A cancelled share must not trigger an unwanted second interaction.
        if (error instanceof DOMException && error.name === "AbortError") {
          return "share";
        }
        console.warn("Partage PDF indisponible, téléchargement direct utilisé.", error);
      }
    }
  }

  downloadFile(file);
  return "download";
}
