import type { Workshop, WorkshopLocation } from './database.types';

function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatLocation(workshop: Workshop): string {
  if (workshop.is_remote) {
    return 'Online';
  }

  if (!workshop.location) {
    return '';
  }

  const loc = workshop.location as WorkshopLocation;
  const parts = [loc.venue_name, loc.street, loc.city, loc.postal_code];
  return escapeICSText(parts.filter(Boolean).join(', '));
}

export function generateICS(workshop: Workshop): string {
  const startDate = new Date(workshop.start_at);
  const endDate = new Date(workshop.end_at);
  const now = new Date();

  const uid = `${workshop.id}@1er-degre.fr`;
  const dtstamp = formatICSDate(now);
  const dtstart = formatICSDate(startDate);
  const dtend = formatICSDate(endDate);

  let description = escapeICSText(workshop.description || '');
  if (workshop.is_remote && workshop.visio_link) {
    description += `\\n\\nLien visio: ${workshop.visio_link}`;
  }
  if (workshop.mural_link) {
    description += `\\n\\nLien Mural: ${workshop.mural_link}`;
  }

  const location = formatLocation(workshop);
  const summary = escapeICSText(workshop.title);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//1er Degré//Workshop Manager//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return ics;
}

export function downloadICS(workshop: Workshop): void {
  const ics = generateICS(workshop);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `atelier-${workshop.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
