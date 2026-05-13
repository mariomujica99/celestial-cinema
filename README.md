# Celestial Cinema Frontend

This is a full-stack web application for browsing movies and shows. Users can leave reviews and save media to a watchlist. Movies and shows contain detailed information including cast, crew, show seasons, and trailers.

[![Website](https://img.shields.io/badge/Website-6A5ACD)](https://mariomujica99.github.io/celestial-cinema/index.html)
[![Backend](https://img.shields.io/badge/Backend-lightslategray)](https://github.com/mariomujica99/celestial-cinema-backend)

## Features

#### Media Discovery
- Browse Categories: Trending, Popular, Now Playing/Airing Today, and Top Rated for both movies and shows
- Movies/Shows Toggle: Switch between movie and show browsing modes with a persistent toggle
- Genre Browsing: Side hamburger menu with genre filters for both movies and TV shows
- Search: Categorized search results across movies, TV shows, and people with count tabs per category
- Detailed Information: Release dates, genres, ratings, runtime, content ratings, and plot overviews
- Streaming Providers: Displays streaming, rent, and buy options for movies and TV shows

#### Cast & Crew
- Actor Profiles: Detailed biographies, birthdate, department, and filmographies with relevance-based scoring
- Cast Lists: Full cast and crew organized by department with episode counts for TV
- Search & Filter: Search cast and crew by name, role, or department
- Popular People: Dedicated page for browsing trending people

#### Video Trailers
- Trailer Strip: Horizontal scrolling trailer previews on detail pages with YouTube modal player
- Full Video Page: Grid layout of all available trailers for a given title
- Responsive: Automatically collapses to a single primary trailer on mobile

#### Similar Media
- Similar Section: Horizontally scrollable strip of related movies or TV shows on each detail page

#### Watchlist
- Save to Watchlist: Add movies and TV shows from grid cards or detail pages
- Watchlist Page: View all saved items sorted by most recently added
- Remove Items: Delete items from the watchlist directly
- Name-based Ownership: Watchlist entries are attributed to a user-entered name

#### Review System
- CRUD Operations: Create, read, update, and delete reviews via a modal interface
- Rating System: 0-10 interactive star rating with drag and pointer support
- TV Episode Reviews: Review an entire series, a specific season, or a specific episode
- All Reviews Page: Browse all reviews across all media with user and media title filters, sort options, and load-more pagination
- Episode List Reviews: Rate individual episodes inline from the season episode list

#### User Interface
- Responsive Design: Optimized for desktop, tablet, and mobile with breakpoints from 400px to 1850px+
- Adaptive Media Grid: 3 to 9 columns depending on viewport width
- Compact/Expand Toggle: On small screens, media detail pages collapse to a compact card layout
- Dynamic Backdrops: Detail page headers use TMDB backdrop images
- Progressive Web App: Installable on mobile and desktop with a custom app icon
- Navigation: Scroll position preserved when navigating between pages

## Technology Stack
 
#### Frontend
- HTML5/CSS3: Semantic markup and custom styling with CSS Grid and Flexbox
- JavaScript: ES6+ features, async/await, Fetch API, pointer events
- Fonts: Rollbox (Custom), Science Gothic, and Montserrat (Google Fonts)
- PWA: Service Worker and Web App Manifest

#### Backend
- Node.js/Express: RESTful API server
- MongoDB: NoSQL database for reviews and watchlist storage
- TMDB API Proxy: Server-side API key management
- Hosted on Render: `https://celestial-cinema-backend.onrender.com`

#### External API
- TMDB API: Movie and TV show data, cast, crew, trailers, providers, and media assets

## Architecture Overview

#### Frontend-Backend Communication
```
Frontend (GitHub Pages)
    ↓
JavaScript Fetch API
    ↓
Backend API (Render)
    ↓
┌─────────────────┬─────────────────┐
│   TMDB API      │   MongoDB       │
│ (Movies/TV/Cast)│ (Reviews/Watch) │
└─────────────────┴─────────────────┘
```

#### Data Flow
- User interacts with frontend UI
- JavaScript makes async request to backend API
- Backend validates request and queries TMDB API or MongoDB
- Backend returns formatted JSON response
- Frontend updates DOM with new data
- Smooth animations and transitions enhance UX

## Author

**Mario Mujica**  
*Neurodiagnostic Technologist*  
*Full-Stack Software Developer*  
*B.S. in Neuroscience*

- GitHub: [@mariomujica99](https://github.com/mariomujica99)
- Backend Repository: [celestial-cinema-backend](https://github.com/mariomujica99/celestial-cinema-backend)
- LinkedIn: [www.linkedin.com/in/mario-mujica-903b19172]
- Handshake: [unomaha.joinhandshake.com/profiles/nbw72u](https://unomaha.joinhandshake.com/profiles/nbw72u)
- Email: mariomujica99@gmail.com

## Resources

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing the comprehensive media API
- [Google Fonts](https://fonts.google.com/) for the Montserrat font family
- [FontSpace](https://www.fontspace.com/) for the Rollbox custom font
- [Render](https://render.com/) for backend hosting
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for cloud database services

## Academic Integrity Notice

This personal project was built as a portfolio demonstration of full-stack development skills, including frontend design, backend API development, database management, and third-party API integration.
