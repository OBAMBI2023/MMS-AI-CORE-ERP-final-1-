const formatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const formatted = formatter.format(1000);
console.log(`Formatted: '${formatted}'`);
console.log(`Char codes: ${[...formatted].map(c => c.charCodeAt(0))}`);
