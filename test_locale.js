const formatterFR = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
console.log(`FR: '${formatterFR.format(1000)}'`);
const formatterCA = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });
console.log(`CA: '${formatterCA.format(1000)}'`);
