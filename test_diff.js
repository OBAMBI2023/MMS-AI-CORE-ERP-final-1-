const n = 1000;
console.log(`toLocaleString: '${n.toLocaleString("fr-FR")}'`);
console.log(`Intl.NumberFormat: '${new Intl.NumberFormat("fr-FR").format(n)}'`);
