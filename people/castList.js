const url = new URL(location.href);
const mediaId = url.searchParams.get("id");
const mediaType = url.searchParams.get("type");
const mediaTitle = url.searchParams.get("title");

const API_LINKS = {
    MOVIE_CREDITS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/credits/${mediaId}`,
    TV_CREDITS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/credits/${mediaId}`,
    TV_AGGREGATE_CREDITS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/aggregate_credits/${mediaId}`,
    MOVIE_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/details/${mediaId}`,
    TV_DETAILS: `https://celestial-cinema-backend.onrender.com/api/v1/movies/tv/details/${mediaId}`,
    IMG_PATH: 'https://image.tmdb.org/t/p/w1280',
    BACKDROP_PATH: 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
};

const castListContainer = document.getElementById("cast-list-container");
const castListTitle = document.getElementById("cast-list-title");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");

const castSearchInput = document.getElementById("cast-search-input");
let allCastAndCrew = {};

searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        window.location.href = `../index.html?search=${encodeURIComponent(searchTerm)}`;
    }
});

castSearchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    filterCastAndCrew(searchTerm);
});

if (mediaTitle) {
    castListTitle.textContent = `${mediaTitle} - Full Cast & Crew`;
} else {
    castListTitle.textContent = "Full Cast & Crew";
}
loadMediaDetails();

const creditsUrl = mediaType === 'tv' ? API_LINKS.TV_AGGREGATE_CREDITS : API_LINKS.MOVIE_CREDITS;
fetchCredits(creditsUrl);

function fetchCredits(url) {
    fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(function(creditsData) {
            displayCastAndCrew(creditsData);
        })
        .catch(error => {
            console.error('Error fetching credits:', error);
            showErrorMessage('Failed to load cast and crew information. Please try again later.');
        });
}

function displayCastAndCrew(creditsData) {
    castListContainer.innerHTML = '';
    
    const cast = creditsData.cast || [];
    const crew = creditsData.crew || [];

    cast.sort((a, b) => {
        const orderA = (a.order !== undefined && a.order !== null) ? a.order : 999;
        const orderB = (b.order !== undefined && b.order !== null) ? b.order : 999;
        return orderA - orderB;
    });

    const departments = {
        [mediaType === 'tv' ? 'Series Cast' : 'Cast']: cast,
        'Art': crew.filter(person => person.department === 'Art'),
        'Camera': crew.filter(person => person.department === 'Camera'),
        'Costume & Make-Up': crew.filter(person => 
            person.department === 'Costume & Make-Up' || 
            person.department === 'Costume Design'
        ),
        'Crew': crew.filter(person => person.department === 'Crew'),
        'Directing': crew.filter(person => person.department === 'Directing'),
        'Editing': crew.filter(person => person.department === 'Editing'),
        'Lighting': crew.filter(person => person.department === 'Lighting'),
        'Location Management': crew.filter(person => person.department === 'Location Management'),
        'Music': crew.filter(person => person.department === 'Music'),
        'Production': crew.filter(person => person.department === 'Production'),
        'Script and Continuity': crew.filter(person => person.department === 'Script and Continuity'),
        'Sound': crew.filter(person => person.department === 'Sound'),
        'Special Effects': crew.filter(person => person.department === 'Special Effects'),
        'Stunts': crew.filter(person => person.department === 'Stunts'),
        'Transportation': crew.filter(person => person.department === 'Transportation'),
        'Visual Effects': crew.filter(person => person.department === 'Visual Effects'),
        'Writing': crew.filter(person => person.department === 'Writing')
    };

    allCastAndCrew = departments;

    const departmentOrder = [
        mediaType === 'tv' ? 'Series Cast' : 'Cast',
        'Directing',
        'Production',
        'Writing',
        'Art',
        'Camera',
        'Costume & Make-Up',
        'Crew',
        'Editing',
        'Lighting',
        'Location Management',
        'Music',
        'Script and Continuity',
        'Sound',
        'Special Effects',
        'Stunts',
        'Transportation',
        'Visual Effects'
    ];

    departmentOrder.forEach(departmentName => {
        const people = departments[departmentName];
        if (people && people.length > 0) {
            displayDepartment(departmentName, people);
        }
    });
}

function displayDepartment(departmentName, people) {
    const departmentSection = document.createElement('div');
    departmentSection.className = 'department-section';
    
    const departmentTitle = document.createElement('h2');
    departmentTitle.className = 'department-title';
    departmentTitle.textContent = departmentName;
    departmentSection.appendChild(departmentTitle);
    
    const peopleContainer = document.createElement('div');
    peopleContainer.className = 'people-container';
    
    let processedPeople;
    if (departmentName === 'Series Cast' && mediaType === 'tv') {
        const groupedPeople = {};
        people.forEach(person => {
            if (!groupedPeople[person.id]) {
                groupedPeople[person.id] = {
                    ...person,
                    roles: []
                };
            }
            
            if (person.roles && person.roles.length > 0) {
                person.roles.forEach(role => {
                    groupedPeople[person.id].roles.push({
                        character: role.character,
                        episode_count: role.episode_count
                    });
                });
            } else {
                groupedPeople[person.id].roles.push({
                    character: person.character,
                    episode_count: person.episode_count
                });
            }
        });
        
        processedPeople = Object.values(groupedPeople);
        processedPeople.sort((a, b) => {
            const orderA = (a.order !== undefined && a.order !== null) ? a.order : 999;
            const orderB = (b.order !== undefined && b.order !== null) ? b.order : 999;
            return orderA - orderB;
        });
    } else {
        processedPeople = people;
    }
    
    processedPeople.forEach(person => {
        const personCard = document.createElement('div');
        personCard.className = 'person-card';
        
        const photoUrl = person.profile_path 
            ? `${API_LINKS.IMG_PATH}${person.profile_path}`
            : '../images/no-image-cast.jpg';
        
        let role = '';
        if (departmentName === 'Series Cast' || departmentName === 'Cast') {
            if (mediaType === 'tv') {
                if (person.roles && person.roles.length > 0) {
                    const roleDescriptions = [];
                    
                    person.roles.forEach(roleData => {
                        const character = roleData.character || '';
                        const episodeCount = roleData.episode_count || 0;
                        
                        if (character && character !== '' && episodeCount > 0) {
                            roleDescriptions.push(`${character} (${episodeCount} Episode${episodeCount > 1 ? 's' : ''})`);
                        } else if (character && character !== '') {
                            roleDescriptions.push(character);
                        } else if (episodeCount > 0) {
                            roleDescriptions.push(`— (${episodeCount} Episode${episodeCount > 1 ? 's' : ''})`);
                        }
                    });
                    
                    if (roleDescriptions.length > 0) {
                        role = roleDescriptions.join(', ');
                    } else {
                        const totalEpisodes = person.total_episode_count || 0;
                        role = totalEpisodes > 0 ? `— (${totalEpisodes} Episode${totalEpisodes > 1 ? 's' : ''})` : 'Unknown Role';
                    }
                
                } else {
                    const totalEpisodes = person.total_episode_count || 0;
                    let character = person.character || '';
                    
                    if (!character && person.roles && person.roles.length > 0) {
                        character = person.roles[0].character || '';
                    }
                    
                    if (character && totalEpisodes > 0) {
                        role = `${character} (${totalEpisodes} Episode${totalEpisodes > 1 ? 's' : ''})`;
                    } else if (character) {
                        role = character;
                    } else if (totalEpisodes > 0) {
                        role = `— (${totalEpisodes} Episode${totalEpisodes > 1 ? 's' : ''})`;
                    } else {
                        role = 'Unknown Role';
                    }
                }
            } else {
                role = person.character || 'Unknown Role';
            }
        } else {
            if (mediaType === 'tv' && person.jobs) {
                const jobTitles = person.jobs.map(job => job.job).join(', ');
                const totalEpisodes = person.total_episode_count || 0;
                if (totalEpisodes > 0) {
                    role = `${jobTitles} (${totalEpisodes} Episode${totalEpisodes > 1 ? 's' : ''})`;
                } else {
                    role = jobTitles;
                }
            } else {
                role = person.job || 'Unknown Role';
            }
        }
        
        personCard.innerHTML = `
            <img class="person-photo" src="${photoUrl}" alt="${person.name}" onerror="this.src='../images/no-image-cast.jpg'">
            <div class="person-details">
                <div class="person-name">${person.name}</div>
                <div class="person-role">${role}</div>
            </div>
        `;
        
        personCard.addEventListener('click', () => {
            window.location.href = `castMember.html?id=${person.id}&name=${encodeURIComponent(person.name)}`;
        });
        
        peopleContainer.appendChild(personCard);
    });
    
    departmentSection.appendChild(peopleContainer);
    castListContainer.appendChild(departmentSection);
}

function filterCastAndCrew(searchTerm) {
    if (!searchTerm) {
        displayFilteredResults(allCastAndCrew);
        return;
    }

    const filteredDepartments = {};
    
    Object.keys(allCastAndCrew).forEach(departmentName => {
        const people = allCastAndCrew[departmentName];
        
        const filteredPeople = people.filter(person => {
            if (person.name && person.name.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            if (departmentName.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            if (departmentName === 'Series Cast' || departmentName === 'Cast') {
                if (mediaType === 'tv' && person.roles) {
                    return person.roles.some(role => 
                        role.character && role.character.toLowerCase().includes(searchTerm)
                    );
                } else if (person.character && person.character.toLowerCase().includes(searchTerm)) {
                    return true;
                }
            } else {
                if (mediaType === 'tv' && person.jobs) {
                    return person.jobs.some(job => 
                        job.job && job.job.toLowerCase().includes(searchTerm)
                    );
                } else if (person.job && person.job.toLowerCase().includes(searchTerm)) {
                    return true;
                }
            }
            
            return false;
        });
        
        if (filteredPeople.length > 0) {
            filteredDepartments[departmentName] = filteredPeople;
        }
    });
    
    displayFilteredResults(filteredDepartments);
}

function displayFilteredResults(departments) {
    castListContainer.innerHTML = '';
    
    const departmentOrder = [
        mediaType === 'tv' ? 'Series Cast' : 'Cast',
        'Directing',
        'Production',
        'Writing',
        'Art',
        'Camera',
        'Costume & Make-Up',
        'Crew',
        'Editing',
        'Lighting',
        'Location Management',
        'Music',
        'Script and Continuity',
        'Sound',
        'Special Effects',
        'Stunts',
        'Transportation',
        'Visual Effects'
    ];

    let hasResults = false;
    
    departmentOrder.forEach(departmentName => {
        const people = departments[departmentName];
        if (people && people.length > 0) {
            displayDepartment(departmentName, people);
            hasResults = true;
        }
    });
    
    if (!hasResults) {
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'cast-loading';
        noResultsDiv.textContent = 'No results found';
        castListContainer.appendChild(noResultsDiv);
    }
}

function loadMediaDetails() {
    const detailsUrl = mediaType === 'tv' ? API_LINKS.TV_DETAILS : API_LINKS.MOVIE_DETAILS;
    
    fetch(detailsUrl)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(function(mediaData) {
            setBackdropBackground(mediaData.backdrop_path);
        })
        .catch(error => {
            console.error('Error fetching media details:', error);
            setBackdropBackground(null);
        });
}

function setBackdropBackground(backdropPath) {
    const castListHeader = document.querySelector('.cast-list-header');
    if (castListHeader && backdropPath) {
        const backdropUrl = `${API_LINKS.BACKDROP_PATH}${backdropPath}`;
        castListHeader.style.backgroundImage = `linear-gradient(rgba(19, 23, 32, 0.8), rgba(19, 23, 32, 0.9)), url('${backdropUrl}')`;
        castListHeader.style.backgroundSize = 'cover';
        castListHeader.style.backgroundPosition = 'center';
        castListHeader.style.backgroundRepeat = 'no-repeat';
    } else if (castListHeader) {
        castListHeader.style.background = `linear-gradient(rgba(19, 23, 32, 0.4), rgba(19, 23, 32, 0.5)), url('../images/no-image-backdrop.jpg')`;
        castListHeader.style.backgroundSize = 'cover';
        castListHeader.style.backgroundPosition = 'center';
        castListHeader.style.backgroundRepeat = 'no-image-backdrop.jpg';
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-red';
    errorDiv.textContent = message;
    castListContainer.innerHTML = '';
    castListContainer.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}