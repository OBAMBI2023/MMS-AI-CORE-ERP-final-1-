export function hotelStayTotals(checkIn:string,checkOut:string,nightlyRate:number,discount=0,extras=0,payments=0){
 const start=Date.parse(`${checkIn}T00:00:00Z`),end=Date.parse(`${checkOut}T00:00:00Z`);
 const nights=Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,Math.round((end-start)/86_400_000)):0;
 const accommodationTotal=Math.max(0,nights*Math.max(0,nightlyRate)-Math.max(0,discount));
 const grandTotal=accommodationTotal+Math.max(0,extras);
 return {nights,accommodationTotal,grandTotal,balanceDue:grandTotal-Math.max(0,payments)};
}
