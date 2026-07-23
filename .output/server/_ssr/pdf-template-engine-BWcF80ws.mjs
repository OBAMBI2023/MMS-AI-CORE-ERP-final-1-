import { t as E } from "../_libs/jspdf.mjs";
import { t as autoTable } from "../_libs/jspdf-autotable.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pdf-template-engine-BWcF80ws.js
async function urlToDataURL(url) {
	const blob = await (await fetch(url)).blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
async function renderLogo(doc, logoUrl) {
	try {
		const dataUrl = await urlToDataURL(logoUrl);
		doc.addImage(dataUrl, "PNG", 10, 10, 50, 20);
	} catch (error) {
		console.error("Failed to render logo:", error);
	}
}
async function renderSignatureAndStamp(doc, signatureUrl, cachetUrl) {
	try {
		const x = 140;
		const y = doc.internal.pageSize.height - 50;
		const width = 50;
		const height = 30;
		const signatureData = await urlToDataURL(signatureUrl);
		doc.addImage(signatureData, "PNG", x, y, width, height);
		if (cachetUrl) {
			const cachetData = await urlToDataURL(cachetUrl);
			doc.saveGraphicsState();
			doc.setGState(new E.GState({ opacity: .75 }));
			doc.addImage(cachetData, "PNG", x, y, width, height);
			doc.restoreGraphicsState();
		}
	} catch (error) {
		console.error("Failed to render signature/stamp:", error);
	}
}
function renderHeader(doc, settings, startY = 10) {
	doc.setTextColor(37, 99, 235);
	doc.setFontSize(22);
	doc.setFont(void 0, "bold");
	doc.text(String(settings.company_name ?? "").toUpperCase(), 200, startY + 10, { align: "right" });
	doc.setFontSize(10);
	doc.setFont(void 0, "normal");
	doc.setTextColor(50, 50, 50);
	doc.text(String(settings.trade_name ?? ""), 200, startY + 16, { align: "right" });
	doc.text(`${String(settings.address ?? "")}, ${String(settings.city ?? "")}`, 200, startY + 22, { align: "right" });
	doc.text(`Tél: ${String(settings.phone ?? "")} | Email: ${String(settings.email ?? "")}`, 200, startY + 28, { align: "right" });
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(.5);
	doc.line(10, startY + 32, 200, startY + 32);
	return startY + 40;
}
async function renderDepensesHeader(doc, settings, logoUrl) {
	let startY = 10;
	if (logoUrl) {
		await renderLogo(doc, logoUrl);
		startY += 25;
	}
	doc.setFontSize(18);
	doc.setFont(void 0, "bold");
	doc.text(String(settings.company_name ?? "").toUpperCase(), 15, startY + 5);
	doc.setFontSize(14);
	doc.setFont(void 0, "normal");
	doc.text("Liste des dépenses", 15, startY + 12);
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(.5);
	doc.line(10, startY + 15, 200, startY + 15);
	return startY + 25;
}
function renderDepensesTable(doc, data, startY) {
	autoTable(doc, {
		startY,
		head: [[
			"Date",
			"Catégorie",
			"Description",
			"Mode de paiement",
			"Montant"
		]],
		body: data.map((d) => [
			d.date,
			d.category,
			d.description || "-",
			d.payment_method || "-",
			d.amount
		]),
		theme: "striped",
		headStyles: {
			fillColor: [
				240,
				240,
				240
			],
			textColor: [
				50,
				50,
				50
			],
			fontStyle: "bold"
		},
		margin: {
			left: 10,
			right: 10
		}
	});
}
function renderDepensesTotals(doc, total, startY) {
	const finalY = doc.lastAutoTable.finalY + 10;
	doc.setFillColor(240, 240, 240);
	doc.rect(10, finalY, 190, 10, "F");
	doc.setFontSize(12);
	doc.setFont(void 0, "bold");
	doc.text(`TOTAL DES DÉPENSES : ${total}`, 15, finalY + 7);
}
function renderTable(doc, items, startY) {
	autoTable(doc, {
		startY,
		head: [[
			"Description",
			"Qté",
			"Prix U.",
			"Remise",
			"TVA",
			"Montant"
		]],
		body: items.map((item) => [
			item.description,
			item.quantite.toString(),
			item.prixUnitaire.toString(),
			item.remise.toString(),
			item.tva.toString(),
			item.montant.toString()
		]),
		theme: "plain",
		headStyles: {
			fillColor: [
				240,
				240,
				240
			],
			textColor: [
				50,
				50,
				50
			],
			fontStyle: "bold",
			lineWidth: .1,
			lineColor: [
				200,
				200,
				200
			]
		},
		bodyStyles: {
			lineWidth: .1,
			lineColor: [
				220,
				220,
				220
			]
		},
		margin: {
			left: 10,
			right: 10
		}
	});
}
function renderFooter(doc, settings) {
	const pageCount = doc.internal.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(100, 116, 139);
		doc.text(`Page ${i} de ${pageCount} - ${settings.company_name}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: "center" });
	}
}
function renderTotals(doc, totals, startY) {
	const rightMargin = 200;
	doc.setFillColor(245, 245, 245);
	doc.rect(130, startY - 5, 75, 25, "F");
	doc.setFontSize(10);
	doc.setTextColor(50, 50, 50);
	doc.text(`Sous-total: ${totals.sousTotal}`, rightMargin - 5, startY, { align: "right" });
	doc.text(`Remise: ${totals.remise}`, rightMargin - 5, startY + 5, { align: "right" });
	doc.text(`TVA: ${totals.tva}`, rightMargin - 5, startY + 10, { align: "right" });
	doc.setFontSize(12);
	doc.setFont(void 0, "bold");
	doc.setTextColor(37, 99, 235);
	doc.text(`Total TTC: ${totals.totalTTC}`, rightMargin - 5, startY + 18, { align: "right" });
	doc.setFont(void 0, "normal");
	doc.setTextColor(50, 50, 50);
}
//#endregion
export { renderHeader as a, renderTable as c, renderFooter as i, renderTotals as l, renderDepensesTable as n, renderLogo as o, renderDepensesTotals as r, renderSignatureAndStamp as s, renderDepensesHeader as t };
