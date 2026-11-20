import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/r/${code}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className="invite">
      <summary>
        Convidar jogadores
        <span className="invite__code-inline">código {code}</span>
      </summary>
      <div className="invite__body">
        <QRCodeSVG value={url} size={148} bgColor="#ffffff" fgColor="#0d2119" />
        <div>
          <p className="invite__code">{code}</p>
          <button type="button" className="button button--ghost" onClick={copyLink}>
            {copied ? "Link copiado!" : "Copiar link"}
          </button>
          <p className="invite__url">{url}</p>
        </div>
      </div>
    </details>
  );
}
