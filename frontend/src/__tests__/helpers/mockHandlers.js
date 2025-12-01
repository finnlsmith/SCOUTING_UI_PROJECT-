/**
 * Mock Service Worker handlers for API mocking in tests
 */
// Use require for compatibility with Jest
const { http, HttpResponse } = require('msw');

// Base URL for API
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const handlers = [
  // GET /api/matches
  http.get(`${API_BASE}/api/matches`, () => {
    return HttpResponse.json([
      {
        file: 'events_3788741.csv',
        label: '2021-07-11 - Italy vs England – Events'
      },
      {
        file: 'events_3788742.csv',
        label: '2021-07-07 - Spain vs Italy – Events'
      },
      {
        file: 'frames_360_3788741.csv',
        label: '2021-07-11 - Italy vs England – Frames 360'
      }
    ]);
  }),

  // GET /api/match/{filename}/viz
  http.get(`${API_BASE}/api/match/:filename/viz`, ({ params }) => {
    const { filename } = params;
    
    if (filename === 'nonexistent.csv') {
      return HttpResponse.json(
        { detail: 'File not found' },
        { status: 404 }
      );
    }

    // Mock Plotly figure response
    return HttpResponse.json({
      data: [
        {
          type: 'scatter',
          mode: 'markers',
          x: [102.5, 98.3, 105.0],
          y: [35.2, 42.1, 38.0],
          marker: { size: [10, 8, 12] }
        }
      ],
      layout: {
        title: 'Shot Map',
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' }
      }
    });
  }),

  // GET /api/match/{filename}/important_moments
  http.get(`${API_BASE}/api/match/:filename/important_moments`, ({ params }) => {
    const { filename } = params;
    
    if (filename === 'nonexistent.csv') {
      return HttpResponse.json(
        { detail: 'File not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json([
      {
        minute: 23,
        second: 15,
        type: 'Goal',
        player: 'L. Shaw',
        team: 'England',
        xg: 0.45
      },
      {
        minute: 67,
        second: 2,
        type: 'High xG Shot',
        player: 'L. Bonucci',
        team: 'Italy',
        xg: 0.85
      }
    ]);
  }),

  // GET /api/match/{filename}/game_phases
  http.get(`${API_BASE}/api/match/:filename/game_phases`, ({ params }) => {
    const { filename } = params;
    
    if (filename === 'nonexistent.csv') {
      return HttpResponse.json(
        { detail: 'File not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json([
      {
        phase: 1,
        start_minute: 0,
        end_minute: 30,
        home_possession: 0.55,
        away_possession: 0.45
      }
    ]);
  }),

  // POST /api/upload
  http.post(`${API_BASE}/api/upload`, async ({ request }) => {
    // Mock file upload response
    return HttpResponse.json({
      data: [
        {
          type: 'scatter',
          mode: 'markers',
          x: [10.0, 15.0],
          y: [20.0, 25.0]
        }
      ],
      layout: {
        title: 'Uploaded CSV Visualization'
      }
    });
  })
];

module.exports = { handlers };

