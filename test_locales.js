const locales = ["fr-FR", "fr-CA", "fr-CH", "fr-BE", "fr-LU"];
for (const locale of locales) {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  console.log(`${locale}: '${formatter.format(1000)}'`);
}
