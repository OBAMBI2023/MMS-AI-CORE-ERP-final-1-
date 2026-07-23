const formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
});
console.log(formatter.format(1000));
