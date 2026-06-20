import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Trip, VisaInfo, SafetyInfo, WeatherForecast, ElectricalInfo } from '../lib/supabaseClient';

export async function generateBriefing(
  trip: Trip,
  visa: VisaInfo | null,
  safety: SafetyInfo | null,
  weather: WeatherForecast | null,
  electrical: ElectricalInfo | null
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Page 1: COVER
  const page1 = pdfDoc.addPage([600, 800]);
  const { width, height } = page1.getSize();

  // Background Header
  page1.drawRectangle({
    x: 0,
    y: height - 200,
    width: width,
    height: 200,
    color: rgb(0.1, 0.1, 0.3), // Navy
  });

  page1.drawText('EXECUTIVE TRAVEL BRIEF', {
    x: 50,
    y: height - 100,
    size: 32,
    font: boldFont,
    color: rgb(1, 0.9, 0), // Safety Yellow
  });

  page1.drawText(`DESTINATION: ${trip.destination.toUpperCase()}`, {
    x: 50,
    y: height - 140,
    size: 14,
    font: font,
    color: rgb(1, 1, 1),
  });

  // Trip Metadata
  let yPos = height - 250;
  page1.drawText('TRIP CONFIGuration', { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
  yPos -= 20;
  page1.drawText(`Departure: ${trip.start_date || 'Open'}`, { x: 50, y: yPos, size: 12, font: font });
  yPos -= 20;
  page1.drawText(`Intelligence Reference: ${trip.id}`, { x: 50, y: yPos, size: 12, font: font });

  // Visa Section
  yPos -= 60;
  page1.drawText('VISA & PROTOCOL', { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
  yPos -= 25;
  page1.drawText(visa?.visaRequired ? 'REQUIREMENT: VISA REQUIRED' : 'REQUIREMENT: NO VISA NEEDED', { x: 50, y: yPos, size: 12, font: boldFont });
  yPos -= 20;
  page1.drawText(`Notes: ${visa?.notes || 'No data'}`, { x: 50, y: yPos, size: 10, font: font, maxWidth: 500 });

  // Page 2: SAFETY & CLIMATE
  const page2 = pdfDoc.addPage([600, 800]);
  yPos = height - 50;
  
  page2.drawText('INTELLIGENCE FEED', { x: 50, y: yPos, size: 18, font: boldFont });
  yPos -= 40;
  
  page2.drawText('SAFETY ADVISORY', { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(1, 0, 0) });
  yPos -= 25;
  page2.drawText(`Status: ${safety?.safetyLevel || 'Unknown'}`, { x: 50, y: yPos, size: 12, font: boldFont });
  yPos -= 20;
  page2.drawText(safety?.generalAdvice || 'No safety data available.', { x: 50, y: yPos, size: 10, font: font, maxWidth: 500, lineHeight: 14 });

  yPos -= 100;
  page2.drawText('LOCAL PROTOCOLS', { x: 50, y: yPos, size: 10, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
  yPos -= 25;
  page2.drawText(`Electrical: ${electrical?.plugType} (${electrical?.voltage})`, { x: 50, y: yPos, size: 10, font: font });
  yPos -= 20;
  page2.drawText(`Climate: ${weather?.forecast?.[0]?.condition || 'Unknown'} - ${weather?.forecast?.[0]?.tempHigh}°C`, { x: 50, y: yPos, size: 10, font: font });

  // Page 3: ITINERARY (If parsed)
  if (trip.parsed_itinerary) {
    const page3 = pdfDoc.addPage([600, 800]);
    yPos = height - 50;
    page3.drawText('FLIGHT LOGISTICS', { x: 50, y: yPos, size: 18, font: boldFont });
    yPos -= 40;
    
    const itinerary = trip.parsed_itinerary;
    page3.drawText(`Airline: ${itinerary.airline || '---'}`, { x: 50, y: yPos, size: 12, font: font });
    yPos -= 20;
    page3.drawText(`Flight Number: ${itinerary.flightNumber || '---'}`, { x: 50, y: yPos, size: 12, font: font });
    yPos -= 20;
    page3.drawText(`Departure: ${itinerary.departureCity || '---'} at ${itinerary.departureTime || '---'}`, { x: 50, y: yPos, size: 12, font: font });
    yPos -= 20;
    page3.drawText(`Terminal/Gate/Seat: ${itinerary.terminal || '---'} / ${itinerary.gate || '---'} / ${itinerary.seat || '---'}`, { x: 50, y: yPos, size: 12, font: font });
  }

  // Finalize
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Executive_Brief_${trip.destination.replace(/ /g, '_')}.pdf`;
  link.click();
}
