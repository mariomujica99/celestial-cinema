# Celestial Cinema Frontend

This is a full-stack web application for discovering movies and TV shows. Users can also view detailed media information, look at cast/crew data, and leave reviews. This project is powered by The Movie Database (TMDB) API.

[![Website](https://img.shields.io/badge/Website-6A5ACD)](https://mariomujica99.github.io/celestial-cinema/index.html)
[![Backend](https://img.shields.io/badge/Backend-lightslategray)](https://github.com/mariomujica99/celestial-cinema-backend)

## Features

#### Media Discovery
- Browse Categories: Trending, Popular, Now Playing, Upcoming, and Top Rated movies
- TV Shows: Dedicated section for television series with season and episode breakdowns
- Search Functionality: Search across movies and TV shows
- Detailed Information: Release dates, genres, ratings, runtime, content ratings, and plot overviews

#### Cast & Crew
- Actor Profiles: Detailed biographies and filmographies
- Cast Lists: Complete cast and crew organized by department
- Search & Filter: Search cast/crew by name, role, or department
- Known For Section: Relevance-based display of notable works

#### Review System
- CRUD Operations: Create, read, update, and delete user reviews
- Rating System: 0-10 star rating scale with average calculations
- TV Episode Reviews: Review specific episodes or entire seasons
- Advanced Filtering: Sort and filter reviews by user, media title, rating, and date
- Load More Pagination: Efficient data loading for better performance

#### User Interface
- Responsive Design: Optimized for desktop, tablet, and mobile devices
- Dynamic Backdrops: Backgrounds using media artwork
- Navigation: Preserved scroll positions, searches, and filters

## Technology Stack

#### Frontend
- HTML5/CSS3: Semantic markup and modern styling
- JavaScript: ES6+ features, async/await, Fetch API
- Fonts: Rollbox (Custom) and Montserrat (Google Fonts)
- Responsive CSS Grid/Flexbox: Mobile responsive layouts

#### Backend
- Node.js/Express: RESTful API server
- MongoDB: NoSQL database for review storage
- TMDB API Proxy: Server-side API integration
- Hosted on Render: `https://celestial-cinema-backend.onrender.com`

#### External API
- TMDB API: Movie and TV show data, cast information, and media assets

## Implementation

#### Dynamic Review System
- Reviews support both movie and TV show content
- TV reviews can target specific episodes or entire seasons
- Filtering by user name, media title, rating, and date
- Pagination with "Load More" functionality
- Automatic timestamp formatting (e.g., "5min ago", "JAN 15 2024")

#### Responsive Media Grid
- Adaptive grid layout: 1-7 columns based on viewport width
- Lazy loading images with error handling and fallback images
- Smooth transitions and hover effects
- User score display with gradient backgrounds

#### Advanced Filtering
- Debounced search inputs for performance optimization
- Combined server-side and client-side filtering
- Maintained filter state across page navigation
- Season/episode specific filtering for TV reviews

#### Cast & Crew Features
- Hierarchical display by department (Directing, Production, Writing, etc.)
- Episode count tracking for TV show cast members
- Search functionality across all departments
- Click-through navigation to detailed profiles
- "Known For" section with relevance-based sorting

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
│   (Movies/TV)   │   (Reviews)     │
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
