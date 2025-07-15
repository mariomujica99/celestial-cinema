function formatTimestamp(dateString) {
    const reviewDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - reviewDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours < 24) {
        if (diffHours < 1) {
            return diffMinutes <= 1 ? '1min ago' : `${diffMinutes}min ago`;
        }
        return diffHours === 1 ? '1hr ago' : `${diffHours}hrs ago`;
    }
    
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                   'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[reviewDate.getMonth()];
    const day = reviewDate.getDate();
    const year = reviewDate.getFullYear();
    
    return `${month} ${day} ${year}`;
}