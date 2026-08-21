// School-year dates parsed from the 2026–27 planning + music calendars, plus a day-by-day
// calendar map (season activity days, no-school days, milestone markers). No personal data.
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
  },
  "calendar": {
    "monthsFrom": "2026-08",
    "monthsTo": "2027-06",
    "seasons": [
      "Fall 2026",
      "Winter 2027",
      "Spring 2027"
    ],
    "activity": {
      "Fall 2026": [
        "2026-09-28",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
        "2026-10-02",
        "2026-10-05",
        "2026-10-06",
        "2026-10-07",
        "2026-10-08",
        "2026-10-09",
        "2026-10-12",
        "2026-10-13",
        "2026-10-14",
        "2026-10-15",
        "2026-10-19",
        "2026-10-20",
        "2026-10-21",
        "2026-10-22",
        "2026-10-23",
        "2026-10-26",
        "2026-10-27",
        "2026-10-28",
        "2026-10-29",
        "2026-10-30",
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
        "2026-11-05",
        "2026-11-06",
        "2026-11-09",
        "2026-11-10",
        "2026-11-12",
        "2026-11-13",
        "2026-11-16",
        "2026-11-17",
        "2026-11-18",
        "2026-11-19",
        "2026-11-20",
        "2026-11-30",
        "2026-12-01",
        "2026-12-02",
        "2026-12-03",
        "2026-12-04",
        "2026-12-07",
        "2026-12-08",
        "2026-12-09",
        "2026-12-10",
        "2026-12-11"
      ],
      "Winter 2027": [
        "2027-01-11",
        "2027-01-12",
        "2027-01-13",
        "2027-01-14",
        "2027-01-15",
        "2027-01-19",
        "2027-01-20",
        "2027-01-21",
        "2027-01-22",
        "2027-01-25",
        "2027-01-26",
        "2027-01-27",
        "2027-01-28",
        "2027-01-29",
        "2027-02-01",
        "2027-02-02",
        "2027-02-03",
        "2027-02-04",
        "2027-02-05",
        "2027-02-17",
        "2027-02-18",
        "2027-02-19",
        "2027-02-22",
        "2027-02-23",
        "2027-02-24",
        "2027-02-25",
        "2027-02-26",
        "2027-03-01",
        "2027-03-02",
        "2027-03-03",
        "2027-03-04",
        "2027-03-05",
        "2027-03-08",
        "2027-03-09",
        "2027-03-10",
        "2027-03-11",
        "2027-03-15",
        "2027-03-16",
        "2027-03-17",
        "2027-03-18",
        "2027-03-19",
        "2027-03-22",
        "2027-03-23",
        "2027-03-24",
        "2027-03-25",
        "2027-03-26",
        "2027-03-29",
        "2027-03-30",
        "2027-03-31",
        "2027-04-01",
        "2027-04-02"
      ],
      "Spring 2027": [
        "2027-04-19",
        "2027-04-20",
        "2027-04-21",
        "2027-04-22",
        "2027-04-23",
        "2027-04-26",
        "2027-04-27",
        "2027-04-28",
        "2027-04-29",
        "2027-04-30",
        "2027-05-03",
        "2027-05-04",
        "2027-05-05",
        "2027-05-06",
        "2027-05-07",
        "2027-05-10",
        "2027-05-11",
        "2027-05-12",
        "2027-05-13",
        "2027-05-14",
        "2027-05-17",
        "2027-05-18",
        "2027-05-19",
        "2027-05-20",
        "2027-05-21",
        "2027-05-24",
        "2027-05-25",
        "2027-05-26",
        "2027-05-27",
        "2027-06-02",
        "2027-06-03",
        "2027-06-04"
      ]
    },
    "noSchool": [
      "2026-09-07",
      "2026-10-16",
      "2026-11-11",
      "2026-11-26",
      "2026-11-27",
      "2026-12-21",
      "2026-12-22",
      "2026-12-23",
      "2026-12-24",
      "2026-12-25",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-18",
      "2027-02-11",
      "2027-02-12",
      "2027-02-15",
      "2027-03-12",
      "2027-04-12",
      "2027-04-13",
      "2027-04-14",
      "2027-04-15",
      "2027-04-16",
      "2027-05-28",
      "2027-05-31",
      "2027-06-18"
    ],
    "events": [
      {
        "date": "2027-02-25",
        "label": "Science Fair (2/25)?",
        "season": "Winter 2027"
      },
      {
        "date": "2027-03-19",
        "label": "Dance Night 3/19 ?",
        "season": "Winter 2027"
      },
      {
        "date": "2027-04-29",
        "label": "Art Night 4/29?",
        "season": "Spring 2027"
      }
    ],
    "markers": [
      {
        "date": "2026-08-26",
        "label": "Meet w/ Principal",
        "season": "Fall 2026",
        "kind": "principal"
      },
      {
        "date": "2026-09-02",
        "label": "Facilitron (building request)",
        "season": "Fall 2026",
        "kind": "facilitron"
      },
      {
        "date": "2026-09-06",
        "label": "Enrollment opens",
        "season": "Fall 2026",
        "kind": "open"
      },
      {
        "date": "2026-09-23",
        "label": "Enrollment closes",
        "season": "Fall 2026",
        "kind": "close"
      },
      {
        "date": "2026-09-24",
        "label": "Rosters to School",
        "season": "Fall 2026",
        "kind": "rosters"
      },
      {
        "date": "2026-12-07",
        "label": "Meet w/ Principal",
        "season": "Winter 2027",
        "kind": "principal"
      },
      {
        "date": "2026-12-09",
        "label": "Facilitron (building request)",
        "season": "Winter 2027",
        "kind": "facilitron"
      },
      {
        "date": "2026-12-14",
        "label": "Enrollment opens",
        "season": "Winter 2027",
        "kind": "open"
      },
      {
        "date": "2027-01-05",
        "label": "Enrollment closes",
        "season": "Winter 2027",
        "kind": "close"
      },
      {
        "date": "2027-01-07",
        "label": "Rosters to School",
        "season": "Winter 2027",
        "kind": "rosters"
      },
      {
        "date": "2027-03-08",
        "label": "Meet w/ Principal",
        "season": "Spring 2027",
        "kind": "principal"
      },
      {
        "date": "2027-03-18",
        "label": "Facilitron (building request)",
        "season": "Spring 2027",
        "kind": "facilitron"
      },
      {
        "date": "2027-03-22",
        "label": "Enrollment opens",
        "season": "Spring 2027",
        "kind": "open"
      },
      {
        "date": "2027-04-06",
        "label": "Enrollment closes",
        "season": "Spring 2027",
        "kind": "close"
      },
      {
        "date": "2027-04-08",
        "label": "Rosters to School",
        "season": "Spring 2027",
        "kind": "rosters"
      }
    ]
  }
};
