export interface LeadRow {
  contactId: string      // col A
  dateIn: string         // col B
  dateCreated: string    // col C
  firstName: string      // col D
  lastName: string       // col E
  email: string          // col F
  phone: string          // col G
  trafficSource: string  // col H
  utmSource: string      // col I
  utmCampaign: string    // col J
  utmMedium: string      // col K
  utmContent: string     // col L
  notes: string          // col M
  bookedACall: string    // col N
}

export interface AppointmentRow {
  contactId: string        // col A
  appointmentId: string    // col B
  firstName: string        // col C
  lastName: string         // col D
  email: string            // col E
  phone: string            // col F
  dateIn: string           // col G — date string, split don't parse
  callDate: string         // col H — datetime string CDT
  callStatus: string       // col I — Call Booked, Showed, No Show, Rescheduled, Cancelled
  callOutcome: string      // col J — WON, Follow Up Scheduled, Deposit Made, PIF, Not Sold, Not Qualified, Need To Follow Up
  cashCollected: string    // col K — raw string, parse to number
  totalPrice: string       // col L
  notesCash: string        // col M
  setter: string           // col N
  closer: string           // col O — Jeff or Theresa
  leadQuality: string      // col P
  callQuality: string      // col Q
  setterRecording: string  // col R
  salesRecording: string   // col S
  trafficSource: string    // col T
  utmSource: string        // col U
  utmCampaign: string      // col V
  utmMedium: string        // col W
  utmContent: string       // col X
  notes: string            // col Y
  calendar: string         // col Z
}
