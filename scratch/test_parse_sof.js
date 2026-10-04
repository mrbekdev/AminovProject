const samples = [
  'TELEFON (SAMSUNG A26 6/128GB OYLIK) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 49090, Sotish narxi: 2,900,000 som, Kelish narxi: 2,496,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 60,000 som, Ajratilgan ulush: 60,000 som, Sof ortiqcha: 344,000 som, Bonus foizi: 3%',
  'KONDESIANER (VOLMER 24AE58W) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 49087, Sotish narxi: 10,720,000 som, Kelish narxi: 9,600,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 1,120,000 som, Bonus foizi: 10%',
  'QUYOSH PECHKA (BRANDO  BR-SH1100) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 49084, Sotish narxi: 120,000 som, Kelish narxi: 96,000 som, Miqdor: 3, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 48,000 som, Bonus foizi: 3%',
  'QOVURGA PECHKA (FERRE FOR-09GR) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 49070, Sotish narxi: 800,000 som, Kelish narxi: 600,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 200,000 som, Bonus foizi: 3%',
  'Sof ortiqcha: 40,000 som',
  'Sof ortiqcha: 504,000 som, Bonus foizi: 5%'
];

function parseOld(desc) {
  const matchProfit = desc.match(/Sof ortiqcha:\s*([\d\s,.'-]+?)(?:\s*(?:som|сўм|so'm|$|,))/i) || desc.match(/Sof ortiqcha:\s*([\d,.-]+)/i);
  if (matchProfit) {
    const valStr = matchProfit[1].replace(/[\s,']/g, '');
    return parseFloat(valStr) || 0;
  }
  return 0;
}

function parseNew(desc) {
  // Matched digits, spaces, commas and dots up until unit word (som, сўм, so'm) or comma before next section
  const matchProfit = desc.match(/Sof ortiqcha:\s*([\d\s,.'-]+?)\s*(?:som|сўм|so['`]?m)/i) ||
                      desc.match(/Sof ortiqcha:\s*([\d,.'-]+)/i);
  if (matchProfit) {
    const valStr = matchProfit[1].replace(/[\s,']/g, '');
    return parseFloat(valStr) || 0;
  }
  return 0;
}

samples.forEach(s => {
  console.log('Old:', parseOld(s), '--> New:', parseNew(s));
});
