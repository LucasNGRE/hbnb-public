const API_URL = 'http://127.0.0.1:5000';  // Ajuste l'URL selon l'environnement

// Fonction pour obtenir la valeur d'un cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Fonction pour vérifier si l'utilisateur est connecté
function checkAuthentication() {
    const token = getCookie('token');
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const userName = document.getElementById('user-name');

    // Vérifiez que les éléments existent avant d'essayer de les manipuler
    if (loginLink) {
        loginLink.style.display = token ? 'none' : 'block';
    }
    if (logoutLink) {
        logoutLink.style.display = token ? 'block' : 'none';
    }

    if (token && document.getElementById('place-details')) {
        // Fetch place details if on the place details page
        const placeId = getPlaceIdFromURL();
        if (placeId) {
            fetchPlaceDetails(token, placeId);
        }
    } else if (token) {
        fetchPlaces(token);
    }
}

// Fonction pour envoyer une demande de connexion à l'API
async function loginUser(email, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    return response;
}

// Fonction pour envoyer une demande de déconnexion à l'API
function logoutUser() {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; // Expire le cookie
    window.location.href = 'login.html'; // Rediriger vers la page de connexion
}

// Fonction pour envoyer une demande de récupération des lieux à l'API
async function fetchPlaces(token) {
    const response = await fetch(`${API_URL}/places`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        const data = await response.json();
        displayPlaces(data);
        populateCountryFilter(data);
    } else {
        console.error('Failed to fetch places:', response.statusText);
    }
}

// Fonction pour créer et afficher les lieux
function displayPlaces(places) {
    const placesList = document.getElementById('places-list');
    placesList.innerHTML = '';  // Clear the current content

    places.forEach(place => {
        const placeElement = document.createElement('div');
        placeElement.className = 'place';
        placeElement.innerHTML = `
            <h3>${place.description}</h3>
            <p>${place.city_name}, ${place.country_name}</p>
            <p>Price per night: $${place.price_per_night}</p>
            <a href="place.html?id=${place.id}">View Details</a>
        `;
        placesList.appendChild(placeElement);
    });
}

// Fonction pour remplir le filtre des pays
function populateCountryFilter(places) {
    const countryFilter = document.getElementById('country-filter');
    const countries = [...new Set(places.map(place => place.country_name))];

    countryFilter.innerHTML = '<option value="">All Countries</option>';  // Default option

    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });

    countryFilter.addEventListener('change', (event) => {
        filterPlacesByCountry(event.target.value);
    });
}

// Fonction pour filtrer les lieux par pays
function filterPlacesByCountry(selectedCountry) {
    const placesList = document.getElementById('places-list');
    const allPlaces = Array.from(placesList.children);

    allPlaces.forEach(place => {
        const countryName = place.querySelector('p:nth-child(2)').textContent.split(', ')[1];
        if (selectedCountry === '' || countryName === selectedCountry) {
            place.style.display = 'block';
        } else {
            place.style.display = 'none';
        }
    });
}

// Fonction pour extraire l'ID du lieu depuis l'URL
function getPlaceIdFromURL() {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('id');
}

// Fonction pour récupérer les détails du lieu
async function fetchPlaceDetails(token, placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch place details');
        }

        const place = await response.json();
        displayPlaceDetails(place);

        // Fetch reviews for the place
        await fetchReviews(token, placeId);
    } catch (error) {
        console.error('Error fetching place details:', error);
    }
}

// Fonction pour afficher les détails du lieu
function displayPlaceDetails(place) {
    const placeDetailsSection = document.getElementById('place-details');

    // Vérifiez si place.images est un tableau avant d'utiliser map()
    const imagesHTML = Array.isArray(place.images) 
        ? place.images.map(img => `<img src="${img}" alt="${place.name}" class="place-image">`).join('')
        : '<p>No images available.</p>';  // Message de secours si aucune image

    placeDetailsSection.innerHTML = `
        <h1>${place.description}</h1>
        <p><strong>Location:</strong> ${place.city_name}, ${place.country_name}</p>
        <div class="place-images">
            ${imagesHTML}
        </div>
    `;
}

// Fonction pour récupérer et afficher les avis
async function fetchReviews(token, placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}/reviews`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reviews');
        }

        const reviews = await response.json();
        displayReviews(reviews);
    } catch (error) {
        console.error('Failed to fetch reviews:', error);
    }
}

// Fonction pour afficher les avis
function displayReviews(reviews) {
    const reviewsSection = document.getElementById('reviews');
    reviewsSection.innerHTML = ''; // Clear existing reviews

    reviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-card';
        reviewElement.innerHTML = `
            <p><strong>${review.user_name || 'Anonymous'}</strong> - Rating: ${review.rating}</p>
            <p>${review.comment}</p>
        `;
        reviewsSection.appendChild(reviewElement);
    });
}

// Fonction pour gérer l'envoi du formulaire d'avis
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-link'); // Assure-toi que ce bouton existe dans tes pages
    const reviewForm = document.getElementById('review-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await loginUser(email, password);

                if (response.ok) {
                    const data = await response.json();
                    // Stocker le token dans un cookie
                    document.cookie = `token=${data.access_token}; path=/`;
                    // Rediriger vers la page d'accueil
                    window.location.href = 'index.html';
                } else {
                    // Afficher un message d'erreur en cas d'échec de la connexion
                    const errorMessage = document.getElementById('error-message');
                    if (errorMessage) {
                        errorMessage.textContent = 'Login failed: ' + response.statusText;
                        errorMessage.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logoutUser();
        });
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const reviewText = document.getElementById('review-text').value;
            const token = getCookie('token');
            const placeId = getPlaceIdFromURL();

            try {
                const response = await fetch(`${API_URL}/places/${placeId}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ comment: reviewText, rating: 5 }) // Ajoute le rating ici si nécessaire
                });

                if (response.ok) {
                    alert('Review added successfully!');
                    document.getElementById('review-text').value = '';  // Clear the form
                    await fetchReviews(token, placeId);  // Rafraîchir les avis
                } else {
                    console.error('Failed to add review:', response.statusText);
                    alert('Failed to add review. Please check the console for more information.');
                }
            } catch (error) {
                console.error('Error adding review:', error);
                alert('An error occurred while adding the review. Please try again.');
            }
        });
    }

    checkAuthentication();
});
