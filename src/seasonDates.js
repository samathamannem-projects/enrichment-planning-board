// School-year dates parsed from the 2026–27 planning + music calendars.
// Milestones, per-weekday session counts, no-class days, and after-school events. No personal data.
export const SEASON_DATES = {
  "enrichment": [
    {
      "name": "Enrichment Fall 2026",
      "weeks": 12,
      "milestones": [
        {
          "label": "Proposal to principal",
          "date": "2026-08-26"
        },
        {
          "label": "Building requests made",
          "date": "2026-09-02"
        },
        {
          "label": "Enrollment opens",
          "date": "2026-09-06"
        },
        {
          "label": "Enrollment closes",
          "date": "2026-09-23"
        },
        {
          "label": "Rosters to the school",
          "date": "2026-09-24"
        },
        {
          "label": "Classes start",
          "date": "2026-09-28"
        },
        {
          "label": "Session ends",
          "date": "2026-12-24"
        }
      ],
      "sessionsPerDay": {
        "Mon": 10,
        "Tue": 9,
        "Wed": 10,
        "Thu": 10,
        "Fri": 10
      },
      "flags": [
        {
          "type": "noclass",
          "note": "Leap Day - No School",
          "dates": [],
          "weekOf": "2026-10-12"
        },
        {
          "type": "noclass",
          "note": "11/11 - No School Veterans Day",
          "dates": [
            "2026-11-11"
          ],
          "weekOf": "2026-11-09"
        },
        {
          "type": "noclass",
          "note": "No Class Thanksgiving Week",
          "dates": [],
          "weekOf": "2026-11-23"
        },
        {
          "type": "noclass",
          "note": "No class week the week before Winter Break. Use for snow day makeups",
          "dates": [],
          "weekOf": "2026-12-14"
        },
        {
          "type": "noclass",
          "note": "Winter Break",
          "dates": [],
          "weekOf": "2026-12-21"
        },
        {
          "type": "noclass",
          "note": "Winter Break",
          "dates": [],
          "weekOf": "2026-12-28"
        }
      ]
    },
    {
      "name": "Enrichment Winter 2027",
      "weeks": 12,
      "milestones": [
        {
          "label": "Proposal to principal",
          "date": "2026-12-07"
        },
        {
          "label": "Building requests made",
          "date": "2026-12-09"
        },
        {
          "label": "Enrollment opens",
          "date": "2026-12-14"
        },
        {
          "label": "Enrollment closes",
          "date": "2027-01-05"
        },
        {
          "label": "Rosters to the school",
          "date": "2027-01-07"
        },
        {
          "label": "Classes start",
          "date": "2027-01-11"
        },
        {
          "label": "Session ends",
          "date": "2027-04-02"
        }
      ],
      "sessionsPerDay": {
        "Mon": 10,
        "Tue": 11,
        "Wed": 12,
        "Thu": 9,
        "Fri": 8
      },
      "flags": [
        {
          "type": "noclass",
          "note": "1/18 MLK Day",
          "dates": [
            "2027-01-18"
          ],
          "weekOf": "2027-01-18"
        },
        {
          "type": "noclass",
          "note": "School Conferences (Jan 26, 28, 29)",
          "dates": [],
          "weekOf": "2027-01-25"
        },
        {
          "type": "noclass",
          "note": "mid-winter Break (Feb 12, 13)",
          "dates": [],
          "weekOf": "2027-02-08"
        },
        {
          "type": "noclass",
          "note": "President's day (2/16)",
          "dates": [
            "2027-02-16"
          ],
          "weekOf": "2027-02-15"
        },
        {
          "type": "event",
          "note": "Science Fair (2/25)?",
          "dates": [
            "2027-02-25"
          ],
          "weekOf": "2027-02-22"
        },
        {
          "type": "noclass",
          "note": "No School Leap Day (3/12)",
          "dates": [
            "2027-03-12"
          ],
          "weekOf": "2027-03-08"
        },
        {
          "type": "event",
          "note": "Dance Night 3/19 ?",
          "dates": [
            "2027-03-19"
          ],
          "weekOf": "2027-03-15"
        },
        {
          "type": "noclass",
          "note": "No class week before Spring Break.",
          "dates": [],
          "weekOf": "2027-04-05"
        },
        {
          "type": "noclass",
          "note": "Spring Break",
          "dates": [],
          "weekOf": "2027-04-12"
        }
      ]
    },
    {
      "name": "Enrichment Spring 2027",
      "weeks": 7,
      "milestones": [
        {
          "label": "Proposal to principal",
          "date": "2027-03-08"
        },
        {
          "label": "Building requests made",
          "date": "2027-03-18"
        },
        {
          "label": "Enrollment opens",
          "date": "2027-03-22"
        },
        {
          "label": "Enrollment closes",
          "date": "2027-04-06"
        },
        {
          "label": "Rosters to the school",
          "date": "2027-04-08"
        },
        {
          "label": "Classes start",
          "date": "2027-04-19"
        },
        {
          "label": "Session ends",
          "date": "2027-06-04"
        }
      ],
      "sessionsPerDay": {
        "Mon": 6,
        "Tue": 6,
        "Wed": 7,
        "Thu": 6,
        "Fri": 6
      },
      "flags": [
        {
          "type": "event",
          "note": "Art Night 4/29?",
          "dates": [
            "2027-04-29"
          ],
          "weekOf": "2027-04-26"
        },
        {
          "type": "noclass",
          "note": "5/28 Leap Day",
          "dates": [
            "2027-05-28"
          ],
          "weekOf": "2027-05-24"
        },
        {
          "type": "noclass",
          "note": "5/31 Memorial Day 6/1 Snow Make up Day *Last Week of Classes*",
          "dates": [
            "2027-05-31",
            "2027-06-01"
          ],
          "weekOf": "2027-05-31"
        }
      ]
    }
  ],
  "music": {
    "name": "Music 2026–27",
    "start": "2026-09-21",
    "milestones": [
      {
        "label": "Enrollment opens",
        "date": "2026-09-07"
      },
      {
        "label": "Enrollment closes",
        "date": "2026-09-18"
      }
    ],
    "flags": [
      {
        "type": "noclass",
        "note": "No School - Leap Day",
        "dates": [],
        "weekOf": "2026-10-12"
      },
      {
        "type": "noclass",
        "note": "No School Veterans Day",
        "dates": [],
        "weekOf": "2026-11-09"
      },
      {
        "type": "noclass",
        "note": "No Enrichment Class Thanksgiving Week",
        "dates": [],
        "weekOf": "2026-11-23"
      },
      {
        "type": "noclass",
        "note": "Winter Break",
        "dates": [],
        "weekOf": "2026-12-21"
      },
      {
        "type": "noclass",
        "note": "No School - MLK Day",
        "dates": [],
        "weekOf": "2027-01-18"
      },
      {
        "type": "noclass",
        "note": "School Conferences",
        "dates": [],
        "weekOf": "2027-01-25"
      },
      {
        "type": "noclass",
        "note": "Midwinter Break",
        "dates": [],
        "weekOf": "2027-02-08"
      },
      {
        "type": "noclass",
        "note": "President's Day",
        "dates": [],
        "weekOf": "2027-02-15"
      },
      {
        "type": "noclass",
        "note": "No School - Leap Day",
        "dates": [],
        "weekOf": "2027-03-08"
      },
      {
        "type": "noclass",
        "note": "Spring Break",
        "dates": [],
        "weekOf": "2027-04-12"
      },
      {
        "type": "noclass",
        "note": "No School - Leap Day",
        "dates": [],
        "weekOf": "2027-05-24"
      },
      {
        "type": "noclass",
        "note": "No School - Memorial Day, Snow Make-up day?",
        "dates": [],
        "weekOf": "2027-05-31"
      },
      {
        "type": "noclass",
        "note": "LAST WEEK OF SCHOOL (No School - Juneteenth)",
        "dates": [],
        "weekOf": "2027-06-14"
      }
    ]
  }
};
