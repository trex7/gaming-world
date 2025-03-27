// Use the categories data from the external file
const gameCategories = window.gameData;

// Global variables
let currentCategory = 'area';
let currentScore = 0;
let chancesLeft = 5;
let guessedCountries = [];

// Global DOM element references
let guessInput, submitButton, chanceSpan, scoreSpan, guessesList;
let gameOverDiv, finalScoreSpan, playAgainButton, tilesWrapper;
let sidePanel, categoriesToggle, categoriesList, categorySearch;

let selectedCategoryIndex = -1;

// Initialize DOM elements
function initializeDOMElements() {
    // Get DOM element references
    guessInput = document.getElementById('guess-input');
    submitButton = document.getElementById('submit-guess');
    chanceSpan = document.getElementById('chances');
    scoreSpan = document.getElementById('score');
    guessesList = document.getElementById('guesses-list');
    gameOverDiv = document.getElementById('game-over');
    finalScoreSpan = document.getElementById('final-score');
    playAgainButton = document.getElementById('play-again');
    tilesWrapper = document.querySelector('.tiles-wrapper');
    sidePanel = document.querySelector('.side-panel');
    categoriesToggle = document.getElementById('categories-toggle');
    categoriesList = document.querySelector('.categories-list');
    categorySearch = document.getElementById('category-search');

    // Initialize game elements after DOM elements are available
    if (!tilesWrapper) {
        console.error('Tiles wrapper not found');
        return;
    }
    
    // Initialize tiles first
    initializeTiles();
    
    // Then initialize categories
    initializeCategoriesList();
    
    // Add event listeners
    submitButton?.addEventListener('click', () => {
        const guess = guessInput.value.trim();
        if (!guess) return;
        
        const result = checkGuess(guess);
        updateUI(guess, result);
        guessInput.value = '';
    });

    guessInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitButton?.click();
        }
    });

    // Tutorial modal events
    const tutorialBtn = document.getElementById('tutorial-btn');
    tutorialBtn?.addEventListener('click', () => {
        const tutorialModal = document.getElementById('tutorial-modal');
        if (!tutorialModal) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'overlay active';
        document.body.appendChild(overlay);
        tutorialModal.classList.remove('hidden');
        tutorialModal.scrollTop = 0;

        overlay.addEventListener('click', closeTutorialModal);
        
        const escapeListener = (e) => {
            if (e.key === 'Escape') {
                closeTutorialModal();
                document.removeEventListener('keydown', escapeListener);
            }
        };
        document.addEventListener('keydown', escapeListener);
    });

    const closeTutorialBtn = document.getElementById('close-tutorial');
    closeTutorialBtn?.addEventListener('click', closeTutorialModal);

    // Side panel events
    categoriesToggle?.addEventListener('click', toggleSidePanel);
    document.querySelector('.close-side-panel')?.addEventListener('click', toggleSidePanel);
    
    // Category search
    categorySearch?.addEventListener('input', filterCategories);
    categorySearch?.addEventListener('keydown', handleCategoryKeyboard);
}

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Initialize game data first
    if (!window.gameData) {
        console.error('Game data not found');
        return;
    }
    
    // Then initialize DOM elements
    initializeDOMElements();
});

function initializeTiles() {
    if (!tilesWrapper) return; // Guard clause
    
    tilesWrapper.innerHTML = '';
    for (let i = 0; i < 100; i++) {
        const tile = document.createElement('div');
        tile.className = 'country-tile';
        tile.innerHTML = `
            <span class="position">#${i + 1}</span>
            <span class="name">🔒</span>
            <span class="area">—</span>
        `;
        tilesWrapper.appendChild(tile);
    }
}

function checkGuess(guess) {
    const normalizedGuess = guess.trim().toLowerCase()
        .normalize('NFKD') // Normalize special characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''); // Remove punctuation
    
    const categoryData = gameCategories[currentCategory].data.slice(0, 100); // Only check first 100 items
    
    const countryIndex = categoryData.findIndex(
        item => item.name.toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/['"]/g, '')
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') === normalizedGuess
    );

    if (countryIndex === -1) {
        return { score: 0, message: currentCategory === 'spotify' ? 
            "This song is not in the top 100!" : 
            "This country is not in the top 100!" 
        };
    }

    const position = countryIndex + 1;
    const score = position;
    
    return {
        score,
        position,
        message: `Position: ${position}! ${score} points!`
    };
}

function updateUI(guess, result) {
    // Check for duplicate guess first
    if (guessedCountries.includes(guess.toLowerCase())) {
        showPopup('duplicate');
        return;
    }

    // Decrease chances and update UI for both correct and incorrect guesses
    chancesLeft--;
    chanceSpan.textContent = chancesLeft;

    if (result.position) {
        // Correct guess
        revealTile(result.position);
        guessedCountries.push(guess.toLowerCase());
        
        const listItem = document.createElement('li');
        const progressBar = document.createElement('div');
        progressBar.className = 'guess-progress';
        progressBar.style.background = getColorForScore(result.score);
        
        listItem.innerHTML = `
            <span>${guess}</span>
            <span>${result.score} points</span>
        `;
        
        listItem.appendChild(progressBar);
        guessesList.prepend(listItem);
        
        setTimeout(() => {
            progressBar.style.width = `${result.score}%`;
        }, 50);

        // Update score
        const oldScore = currentScore;
        currentScore += result.score;
        animateScore(oldScore, currentScore);
    } else {
        // Incorrect guess - add to list with 0 points
        const listItem = document.createElement('li');
        const progressBar = document.createElement('div');
        progressBar.className = 'guess-progress';
        progressBar.style.background = getColorForScore(0);
        
        listItem.innerHTML = `
            <span>${guess}</span>
            <span>0 points</span>
        `;
        
        listItem.appendChild(progressBar);
        guessesList.prepend(listItem);
        
        // Show the "not in top 100" popup
        showPopup('notTop100');
    }

    // Check if game is over
    if (chancesLeft === 0) {
        // Disable input during animations
        guessInput.disabled = true;
        submitButton.disabled = true;

        // Wait for all animations to complete before showing game over
        const animationDelay = result.position ? 2000 : 1000; // Longer delay for correct guesses
        
        setTimeout(() => {
            endGame();
        }, animationDelay);
    }
}

function formatValue(value, unit) {
    if (unit.includes('billion')) {
        return value.toFixed(3) + ' billion';
    } else if (unit.includes('million')) {
        return value.toFixed(1) + ' million';
    }
    return value.toLocaleString() + ' ' + unit;
}

function revealTile(position) {
    const categoryData = gameCategories[currentCategory].data;
    const country = categoryData[position - 1];
    const tile = tilesWrapper?.children[position - 1];
    
    // Guard clause - if tile doesn't exist, log error and return
    if (!tile) {
        console.error(`Tile at position ${position} not found`);
        return;
    }
    
    tile.className = 'country-tile revealed success-animation';
    
    const value = formatValue(country.value, gameCategories[currentCategory].unit);
    
    tile.innerHTML = `
        <span class="position">#${position}</span>
        <span class="name">${country.name}</span>
        <span class="area">${value}</span>
    `;
    
    setTimeout(() => {
        tile.classList.remove('success-animation');
    }, 1500);
    
    const tileHeight = 60;
    const containerHeight = 300;
    const scrollPosition = (position - 1) * tileHeight;
    const maxScroll = (100 * tileHeight) - containerHeight;
    
    const finalScroll = Math.min(
        Math.max(0, scrollPosition - (containerHeight / 2) + (tileHeight / 2)),
        maxScroll
    );
    
    if (tilesWrapper) {
        tilesWrapper.style.transform = `translateY(-${finalScroll}px)`;
    }
}

function getColorForScore(score) {
    if (score === 0) {
        return 'rgba(220, 0, 0, 0.8)'; // Increased opacity for wrong guesses
    }
    
    // Adjust color scale with increased opacity and adjusted brightness
    if (score <= 33) {
        // Red range - darker and more visible
        const brightness = 25 + (score * 1);
        return `hsla(0, 100%, ${brightness}%, 0.8)`;
    } else if (score <= 66) {
        // Red through yellow - more saturated
        const hue = (score - 33) * (60 / 33); // 0 to 60 (red to yellow)
        return `hsla(${hue}, 100%, 45%, 0.8)`;
    } else {
        // Yellow to green - darker and more saturated
        const hue = 60 + ((score - 66) * (60 / 34)); // 60 to 120 (yellow to green)
        return `hsla(${hue}, 100%, 45%, 0.8)`;
    }
}

function showPopup(type) {
    const popupId = type === 'invalid' ? 'invalid-popup' : 
                    type === 'notTop100' ? 'popup' :
                    'duplicate-popup';
    
    const popup = document.getElementById(popupId);
    popup.classList.remove('hidden');
    
    // Remove the popup after animation completes
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 2000);
}

function animateScore(startScore, endScore) {
    const duration = 1000; // 1 second animation
    const steps = 60; // 60 steps for smooth animation
    const increment = (endScore - startScore) / steps;
    let currentStep = 0;
    
    const animation = setInterval(() => {
        currentStep++;
        const currentValue = Math.round(startScore + (increment * currentStep));
        scoreSpan.textContent = currentValue;
        
        if (currentStep >= steps) {
            clearInterval(animation);
            scoreSpan.textContent = endScore; // Ensure we end on the exact number
        }
    }, duration / steps);
}

function endGame() {
    const finalScore = currentScore;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    
    // Set game over content with added Show Answers button
    gameOverDiv.innerHTML = `
        <h2>Game Over!</h2>
        <div class="final-score-container">
            <div class="final-score-label">FINAL SCORE</div>
            <div class="final-score-value">${finalScore}</div>
        </div>
        <p class="play-again-text">Want to try again?</p>
        <div class="game-over-buttons">
            <button id="show-answers" class="show-answers-btn">Show Answers</button>
            <button id="play-again" class="play-again-btn">Play Again</button>
        </div>
    `;
    
    // Show overlay and game over popup
    setTimeout(() => {
        overlay.classList.add('active');
        gameOverDiv.classList.remove('hidden');
    }, 50);
    
    guessInput.disabled = true;
    submitButton.disabled = true;

    // Add event listener for Show Answers button
    document.getElementById('show-answers').addEventListener('click', showAllAnswers);
    
    // Re-attach event listener to new play-again button
    document.getElementById('play-again').addEventListener('click', () => {
        overlay.remove();
        resetGame();
    });
}

function showAllAnswers() {
    // Hide game over screen
    gameOverDiv.classList.add('hidden');
    
    // Create answers modal
    const answersModal = document.createElement('div');
    answersModal.className = 'answers-modal';
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay active';
    
    // Get current category data (limit to top 100 and reverse for descending order)
    const categoryData = gameCategories[currentCategory].data.slice(0, 100).reverse();
    const categoryUnit = gameCategories[currentCategory].unit;
    
    answersModal.innerHTML = `
        <div class="answers-content">
            <h2>${gameCategories[currentCategory].title}</h2>
            <div class="answers-tiles-container">
                ${categoryData.map((country, index) => {
                    const position = 100 - index; // This will go from 100 down to 1
                    const formattedValue = formatValue(country.value, categoryUnit);
                    return `
                        <div class="answer-tile">
                            <span class="position">#${position}</span>
                            <span class="name">${country.name}</span>
                            <span class="area">${formattedValue}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <button id="close-answers" class="close-answers-btn">Close</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(answersModal);
    
    // Function to close answers modal
    const closeAnswersModal = () => {
        overlay.remove();
        answersModal.remove();
        gameOverDiv.classList.remove('hidden');
    };
    
    // Add event listeners for closing
    document.getElementById('close-answers').addEventListener('click', closeAnswersModal);
    overlay.addEventListener('click', closeAnswersModal);
    
    // Add escape key listener
    const escapeListener = (e) => {
        if (e.key === 'Escape') {
            closeAnswersModal();
            document.removeEventListener('keydown', escapeListener);
        }
    };
    document.addEventListener('keydown', escapeListener);
}

function resetGame() {
    currentScore = 0;
    chancesLeft = 5;
    guessedCountries = []; // Reset guessed countries
    scoreSpan.textContent = currentScore;
    chanceSpan.textContent = chancesLeft;
    guessesList.innerHTML = '';
    guessInput.disabled = false;
    submitButton.disabled = false;
    gameOverDiv.classList.add('hidden');
    guessInput.value = '';
    initializeTiles();
    tilesWrapper.style.transform = 'translateY(0)';
}

function isGameInProgress() {
    return chancesLeft < 5 || currentScore > 0 || guessedCountries.length > 0;
}

function showConfirmationDialog(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay active';
    
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <h3>End Current Game?</h3>
        <p>Switching categories will end your current game. Are you sure?</p>
        <div class="confirm-buttons">
            <button class="confirm-btn cancel">No, Continue Playing</button>
            <button class="confirm-btn confirm">Yes, Switch Category</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(confirmDialog);
    
    const closeDialog = () => {
        overlay.remove();
        confirmDialog.remove();
    };
    
    confirmDialog.querySelector('.cancel').addEventListener('click', () => {
        closeDialog();
        callback(false);
    });
    
    confirmDialog.querySelector('.confirm').addEventListener('click', () => {
        closeDialog();
        callback(true);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', () => {
        closeDialog();
        callback(false);
    });
    
    // Close on Escape key
    const escapeListener = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            callback(false);
            document.removeEventListener('keydown', escapeListener);
        }
    };
    document.addEventListener('keydown', escapeListener);
}

function toggleSidePanel() {
    sidePanel.classList.toggle('active');
    document.querySelector('.game-container').classList.toggle('side-panel-active');
}

function initializeCategoriesList() {
    const categoriesContainer = document.getElementById('categories-container');
    if (!categoriesContainer) {
        console.error('Categories container not found');
        return;
    }
    
    categoriesContainer.innerHTML = '';
    
    Object.entries(gameCategories).forEach(([key, category]) => {
        const item = document.createElement('div');
        item.className = `category-item ${key === currentCategory ? 'active' : ''}`;
        
        // Get appropriate icon based on category
        const icon = getCategoryIcon(key);
        
        item.innerHTML = `
            <div class="icon">${icon}</div>
            <div class="info">
                <h3>${category.title}</h3>
            </div>
        `;
        
        item.addEventListener('click', () => {
            if (key !== currentCategory) {
                if (isGameInProgress()) {
                    showConfirmationDialog((confirmed) => {
                        if (confirmed) {
                            switchCategory(key);
                            toggleSidePanel();
                        }
                    });
                } else {
                    switchCategory(key);
                    toggleSidePanel();
                }
            }
        });
        
        categoriesContainer.appendChild(item);
    });
}

function filterCategories() {
    const searchTerm = categorySearch.value.toLowerCase().trim();
    const categoryItems = document.querySelectorAll('.category-item');
    const noResults = document.getElementById('no-results');

    // Reset selection when filter changes
    selectedCategoryIndex = -1;

    // Guard clause - if no-results element doesn't exist, return
    if (!noResults) {
        console.error('No results element not found');
        return;
    }

    let hasVisibleCategories = false;
    let visibleItems = [];

    categoryItems.forEach(item => {
        const categoryTitle = item.querySelector('h3');
        // Guard clause - if h3 doesn't exist, skip this item
        if (!categoryTitle) return;

        const categoryName = categoryTitle.textContent.toLowerCase();
        if (categoryName.includes(searchTerm)) {
            item.style.display = 'flex';
            hasVisibleCategories = true;
            visibleItems.push(item);
        } else {
            item.style.display = 'none';
        }
        
        // Remove any existing selection styling
        item.classList.remove('keyboard-selected');
    });

    // Show/hide no results message based on whether we found any matches
    if (searchTerm === '') {
        noResults.classList.add('hidden');
        categoryItems.forEach(item => item.style.display = 'flex');
    } else {
        noResults.classList.toggle('hidden', hasVisibleCategories);
    }
}

// Add keyboard navigation
function handleCategoryKeyboard(e) {
    const visibleItems = Array.from(document.querySelectorAll('.category-item'))
        .filter(item => item.style.display !== 'none');
    
    if (visibleItems.length === 0) return;

    // Remove current selection if exists
    if (selectedCategoryIndex >= 0 && selectedCategoryIndex < visibleItems.length) {
        visibleItems[selectedCategoryIndex].classList.remove('keyboard-selected');
    }

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            // If no selection, select first item, otherwise move to next
            if (selectedCategoryIndex === -1) {
                selectedCategoryIndex = 0;
            } else {
                selectedCategoryIndex = selectedCategoryIndex < visibleItems.length - 1 ? 
                    selectedCategoryIndex + 1 : 0;
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            // If no selection, select last item, otherwise move to previous
            if (selectedCategoryIndex === -1) {
                selectedCategoryIndex = visibleItems.length - 1;
            } else {
                selectedCategoryIndex = selectedCategoryIndex > 0 ? 
                    selectedCategoryIndex - 1 : visibleItems.length - 1;
            }
            break;
        case 'Enter':
            if (selectedCategoryIndex >= 0 && selectedCategoryIndex < visibleItems.length) {
                e.preventDefault();
                const selectedItem = visibleItems[selectedCategoryIndex];
                selectedItem.click();
                // Clear the search and close the panel after selection
                categorySearch.value = '';
                filterCategories();
                return;
            } else if (visibleItems.length === 1) {
                // If there's only one visible item, select it even if not keyboard-selected
                e.preventDefault();
                visibleItems[0].click();
                categorySearch.value = '';
                filterCategories();
                return;
            }
            break;
        default:
            return;
    }

    // Apply new selection
    if (selectedCategoryIndex >= 0 && selectedCategoryIndex < visibleItems.length) {
        const selectedItem = visibleItems[selectedCategoryIndex];
        selectedItem.classList.add('keyboard-selected');
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function switchCategory(category) {
    currentCategory = category;
    document.getElementById('current-category').textContent = gameCategories[category].title;
    resetGame();
    initializeCategoriesList();
}

function getCategoryIcon(category) {
    const icons = {
        area: '<i class="fas fa-ruler-combined"></i>',
        population: '<i class="fas fa-users"></i>',
        instagram: '<i class="fab fa-instagram"></i>',
        spotify: '<i class="fab fa-spotify"></i>'
    };
    return icons[category] || '<i class="fas fa-globe"></i>';
}

function closeTutorialModal() {
    const tutorialModal = document.getElementById('tutorial-modal');
    const overlay = document.querySelector('.overlay');
    tutorialModal.classList.add('hidden');
    if (overlay) overlay.remove();
    // Reset scroll position
    tutorialModal.scrollTop = 0;
} 
