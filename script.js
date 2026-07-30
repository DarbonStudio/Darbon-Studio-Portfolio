// ==========================================================================
// CONFIGURATION & VARIABLES DE DÉPART
// ==========================================================================
const track = document.querySelector('.carousel-track');
const cards = document.querySelectorAll('.card');
const featuredImg = document.getElementById('featured-image');

// Les éléments de notre texte fixe central
const activeTitle = document.getElementById('active-title');
const activeCategory = document.getElementById('active-category');

// Paramètres de notre défilement horizontal infini
// RÈGLE D'OR : Pour éviter toute saccade, "spacing" doit être égal à :
// (Largeur_Carte_CSS * (maxScale + minScale) / 2) + gap
const cardCount = cards.length;
let cardBaseWidth = 600;
let cardBaseHeight = 390;
let spacing = 510;       
let totalWidth = cardCount * spacing;
let halfTotalWidth = totalWidth / 2;

function updateDimensions() {
    const maxW = 600;
    const computedW = Math.min(maxW, Math.max(320, Math.min(window.innerWidth * 0.42, (window.innerHeight - 180) * 1.15)));
    cardBaseWidth = computedW;
    cardBaseHeight = computedW * (390 / 600);
    spacing = computedW * 0.85; 
    totalWidth = cardCount * spacing;
    halfTotalWidth = totalWidth / 2;

    document.documentElement.style.setProperty('--card-width', `${cardBaseWidth}px`);
    document.documentElement.style.setProperty('--card-height', `${cardBaseHeight}px`);
}

updateDimensions();
window.addEventListener('resize', updateDimensions, { passive: true });

// Variables de physique et d'inertie
let targetX = 0;           
let currentX = 0;          
let previousX = 0;         // Permet de calculer la vélocité générale
const scrollSensitivity = 0.08; // Sensibilité de départ

// États pour l'aimantage par ressort (Spring Snapping)
let isScrolling = false;
let scrollTimeout = null;
let isNavigating = false;   // Verrou de sécurité contre le spam-clic

// Paramètres physiques de l'aimant par ressort (Spring Physics)
let springVelocity = 0;
const springStiffness = 0.22; // Force d'attraction vive et rapide
const springDamping = 0.52;   // Freinage ferme pour stabiliser le mouvement sans oscillations

// États pour le drag de glissement (souris et tactile)
let isDragging = false;
let startX = 0;
let startCurrentX = 0;
let hasDragged = false;      // Permet de différencier un clic d'un glissement

// Variables pour l'inertie cinétique de glissement (Flick / Throw)
let inertiaVelocity = 0;    // Vitesse d'inertie active après lancer
let lastPointerX = 0;       // Dernière coordonnée X du pointeur
let dragVelocity = 0;       // Vitesse instantanée calculée pendant le drag
const friction = 0.90;      // Friction de glisse (0.90 = glissement soyeux et prévisible)

// Profondeur de vitesse lissée pour isoler et supprimer le rebond de l'aimant
let currentSpeedDepth = 0;  

// Mise en cache des cartes et des images pour éviter querySelector à chaque frame
const cardItems = Array.from(cards).map((card) => {
    const img = card.querySelector('.card-media img');
    if (img) {
        card.dataset.imgSrc = img.src;
    }
    return { card, img };
});

// Buffers de calcul réutilisables (évite les allocations mémoire et Garbage Collection à 60 FPS)
const rawX = new Float32Array(cardCount);
const scales = new Float32Array(cardCount);
const widths = new Float32Array(cardCount);
const finalX = new Float32Array(cardCount);

// Gestion du hover subtil
const hoverStates = new Uint8Array(cardCount);
const hoverMultipliers = new Float32Array(cardCount).fill(1.0);

cardItems.forEach((item, index) => {
    item.card.addEventListener('mouseenter', () => { hoverStates[index] = 1; });
    item.card.addEventListener('mouseleave', () => { hoverStates[index] = 0; });
});

// ==========================================================================
// CAPTURE DU SCROLL (MOLETTE SOURIS AVEC IMPULSION)
// ==========================================================================
window.addEventListener('wheel', (event) => {
    if (isNavigating) return;

    event.preventDefault();
    isScrolling = true;
    
    // Ajout d'une impulsion cinétique calculée selon la sensibilité réduite
    inertiaVelocity -= event.deltaY * scrollSensitivity;

    // Détection de fin de défilement de molette
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (Math.abs(inertiaVelocity) < 0.4) {
            isScrolling = false;
        }
    }, 80); 
}, { passive: false });

// ==========================================================================
// GESTION DU GLISSEMENT (DRAG SOURIS ET TACTILE)
// ==========================================================================
window.addEventListener('mousedown', (event) => {
    if (isNavigating) return;
    isDragging = true;
    hasDragged = false;
    startX = event.clientX;
    lastPointerX = startX;
    startCurrentX = targetX;
    
    // Interception tactile : On coupe instantanément l'inertie précédente au toucher
    inertiaVelocity = 0; 
});

window.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    isScrolling = true;
    
    const currentPointerX = event.clientX;
    const deltaX = currentPointerX - startX;
    
    // Calcul de la vitesse instantanée du mouvement du pointeur
    dragVelocity = currentPointerX - lastPointerX;
    lastPointerX = currentPointerX;
    
    if (Math.abs(deltaX) > 5) {
        hasDragged = true;
    }
    
    targetX = startCurrentX + deltaX * 1.1; 
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    
    if (hasDragged) {
        // Transfert de la vitesse du geste vers l'inertie globale
        inertiaVelocity = dragVelocity * 1.5;
    }
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (Math.abs(inertiaVelocity) < 0.4) {
            isScrolling = false;
        }
    }, 50); 
});

// Événements tactiles mobiles
window.addEventListener('touchstart', (event) => {
    if (isNavigating) return;
    isScrolling = true;
    hasDragged = false;
    startX = event.touches[0].clientX;
    lastPointerX = startX;
    startCurrentX = targetX;
    
    // Interception tactile
    inertiaVelocity = 0; 
}, { passive: true });

window.addEventListener('touchmove', (event) => {
    if (isNavigating) return;
    const currentPointerX = event.touches[0].clientX;
    const deltaX = currentPointerX - startX;
    
    // Calcul de la vitesse instantanée du doigt
    dragVelocity = currentPointerX - lastPointerX;
    lastPointerX = currentPointerX;

    if (Math.abs(deltaX) > 5) {
        hasDragged = true;
    }
    targetX = startCurrentX + deltaX * 1.1;
}, { passive: true });

window.addEventListener('touchend', () => {
    isDragging = false;
    if (hasDragged) {
        inertiaVelocity = dragVelocity * 1.5;
    }
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (Math.abs(inertiaVelocity) < 0.4) {
            isScrolling = false;
        }
    }, 50); 
}, { passive: true });

// ==========================================================================
// GESTION DE LA REDIRECTION IMMERSIVE AVEC SÉCURITÉ ANTI-SPAM
// ==========================================================================
function openProject(activeCard) {
    if (isNavigating) return; 
    isNavigating = true;      
    
    document.body.style.pointerEvents = 'none';

    // Application dynamique de la view-transition-name uniquement sur l'image du projet actif cliqué
    const activeImg = activeCard.querySelector('.card-media img');
    if (activeImg) {
        activeImg.style.viewTransitionName = 'project-image';
    }

    // Collecte des données du projet actif
    const title = encodeURIComponent(activeCard.getAttribute('data-title'));
    const category = encodeURIComponent(activeCard.getAttribute('data-category'));
    const date = encodeURIComponent(activeCard.getAttribute('data-date') || "2026");
    const client = encodeURIComponent(activeCard.getAttribute('data-client') || "Darbon Studio");
    const description = encodeURIComponent(activeCard.getAttribute('data-description') || "");
    const imgUrl = encodeURIComponent(activeCard.dataset.imgSrc); 

    // Redirection vers "project.html" avec les paramètres d'URL
    window.location.href = `project.html?title=${title}&category=${category}&date=${date}&client=${client}&desc=${description}&img=${imgUrl}&t=${Date.now()}`;
}

// Clic sur les vignettes (recentrage ou ouverture)
cards.forEach((card) => {
    card.addEventListener('click', () => {
        if (isNavigating || hasDragged) return; // Bloque le clic si l'utilisateur est en train de glisser

        const currentCardX = parseFloat(card.dataset.currentX || 0);
        
        if (!card.classList.contains('active')) {
            // Si la vignette cliquée n'est pas au centre, on glisse le carrousel pour la recentrer
            isScrolling = true;
            inertiaVelocity = 0; // On coupe l'inertie de glisse pour se concentrer sur la cible cliquée
            targetX -= currentCardX;
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false; // L'aimant prend le relais pour verrouiller parfaitement le centre
            }, 100); 
        } else {
            // Si elle est déjà au centre, on ouvre le projet
            openProject(card);
        }
    });
});

// Clic sur la légende d'informations centrale cliquable pour ouvrir le projet actif
const activeInfo = document.querySelector('.active-project-info');
if (activeInfo) {
    activeInfo.addEventListener('click', () => {
        if (isNavigating || isDragging) return;
        const activeCard = document.querySelector('.card.active');
        if (activeCard) {
            openProject(activeCard);
        }
    });
}

// ==========================================================================
// GESTION DU RETOUR DEPUIS LE CACHE DU NAVIGATEUR (BFCache)
// ==========================================================================
window.addEventListener('pageshow', (event) => {
    isNavigating = false;
    document.body.style.pointerEvents = 'auto';

    // Supprime la vue transition sur l'image pour éviter les conflits au retour
    cards.forEach((card) => {
        const img = card.querySelector('.card-media img');
        if (img) {
            img.style.viewTransitionName = '';
        }
    });

    if (event.persisted) {
        isScrolling = false;
        targetX = Math.round(targetX / spacing) * spacing;
    }
});

// ==========================================================================
// MISE À JOUR DU TEXTE FIXE CENTRAL (DÉCOUPAGE DYNAMIQUE)
// ==========================================================================
function updateActiveProjectData(activeCard) {
    const newTitle = activeCard.getAttribute('data-title');
    const newCategory = activeCard.getAttribute('data-category');

    if (activeTitle.innerHTML !== newTitle) {
        activeTitle.style.opacity = 0;
        activeCategory.style.opacity = 0;

        setTimeout(() => {
            // MODIFIÉ : Analyse et découpage dynamique du titre pour séparer les polices
            const textClean = newTitle.replace(/<br\s*\/?>/gi, ' ');
            const words = textClean.split(' ');
            
            if (words.length >= 2) {
                // Si le titre contient au moins 2 mots, le premier est en Bricolage et les suivants en Cormorant
                const firstWord = words[0];
                const restOfWords = words.slice(1).join(' ');
                activeTitle.innerHTML = `<span class="title-bricolage">${firstWord}</span> <span class="title-cormorant">${restOfWords}</span>`;
            } else {
                // S'il n'y a qu'un seul mot, on le garde entier en Bricolage
                activeTitle.innerHTML = `<span class="title-bricolage">${textClean}</span>`;
            }

            activeCategory.innerHTML = newCategory;
            
            activeTitle.style.opacity = 1;
            activeCategory.style.opacity = 1;
        }, 300);
    }
}

// ==========================================================================
// BOUCLE D'ANIMATION PHYSIQUE
// ==========================================================================
function animate() {
    // 1. Application de l'inertie cinétique de lancer / glisse (Flick & Wheel coasting)
    if (inertiaVelocity !== 0) {
        targetX += inertiaVelocity;
        inertiaVelocity *= friction; 
        
        if (Math.abs(inertiaVelocity) < 0.4) {
            inertiaVelocity = 0;
            if (!isDragging) {
                isScrolling = false; 
            }
        }
    }

    // Application de l'inertie de base (lerp) sur le déplacement actuel
    currentX += (targetX - currentX) * 0.16;

    // Calcul de la vélocité instantanée générale (pour les micro-effets)
    const velocity = currentX - previousX;
    previousX = currentX; 

    // Limitation de la vélocité pour la déformation
    const maxVelocity = 10;
    const clampedVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity));

    // 2. AIMANTAGE PHYSIQUE PAR RESSORT (Spring Snapping)
    if (!isScrolling && !isDragging && inertiaVelocity === 0) {
        const nearestSnap = Math.round(targetX / spacing) * spacing;
        
        // Force de rappel progressive : F = -K * Déplacement
        const displacement = nearestSnap - targetX;
        const force = displacement * springStiffness;
        
        springVelocity += force;      
        springVelocity *= springDamping; 
        
        targetX += springVelocity; 
    } else {
        springVelocity = 0; 
    }

    // Calcul de la profondeur (zoom arrière) uniquement durant l'interaction de l'utilisateur.
    let targetSpeedDepth = 0;
    if (isScrolling || isDragging) {
        targetSpeedDepth = -Math.min(Math.abs(clampedVelocity) * 5, 50);
    }
    currentSpeedDepth += (targetSpeedDepth - currentSpeedDepth) * 0.15;

    let closestCard = null;
    let minDistanceToCenter = Infinity;

    // 3. ALIGNEMENT ET RENDU DES CARTES SUR LE RAIL HORIZONTAL INFINI
    const gap = 0; 
    const maxScale = 1.1; 
    const minScale = 0.6; 
    const scaleDiff = maxScale - minScale; // 0.5

    for (let index = 0; index < cardCount; index++) {
        let x = (index * spacing) + currentX;

        // Mathématiques de la boucle horizontale infinie
        x = x % totalWidth;
        if (x < -halfTotalWidth) x += totalWidth;
        if (x > halfTotalWidth) x -= totalWidth;

        rawX[index] = x;

        // Calcul de la progression de distance
        const absX = Math.abs(x);
        const progress = Math.min(absX / spacing, 1.0);
        
        // Calcul continu fluide de l'échelle entre maxScale et minScale
        const baseScale = minScale + (1.0 - progress) * scaleDiff;
        
        // Interpolation douce du multiplicateur de survol (hover)
        const targetHover = hoverStates[index] ? 1.02 : 1.0;
        hoverMultipliers[index] += (targetHover - hoverMultipliers[index]) * 0.1;
        
        const finalScale = baseScale * hoverMultipliers[index];
        scales[index] = finalScale;

        widths[index] = cardBaseWidth * finalScale;
    }

    // Recherche de l'index de la carte la plus proche du centre absolu (X = 0)
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let index = 0; index < cardCount; index++) {
        const absDist = Math.abs(rawX[index]);
        if (absDist < minDistance) {
            minDistance = absDist;
            closestIndex = index;
        }
    }

    // --- CHAÎNAGE MATHÉMATIQUES ---
    finalX[closestIndex] = rawX[closestIndex];

    // Positionnement des projets situés vers la droite
    for (let k = 1; k <= 3; k++) {
        const i = (closestIndex + k) % cardCount;
        const prev = (closestIndex + k - 1) % cardCount;
        finalX[i] = finalX[prev] + widths[prev] / 2 + widths[i] / 2 + gap;
    }

    // Positionnement des projets situés vers la gauche
    for (let k = 1; k <= 3; k++) {
        const i = (closestIndex - k + cardCount) % cardCount;
        const next = (closestIndex - k + 1 + cardCount) % cardCount;
        finalX[i] = finalX[next] - widths[next] / 2 - widths[i] / 2 - gap;
    }

    // 5. APPLICATION DES TRANSFORMS ET RENDU FINAL
    for (let index = 0; index < cardCount; index++) {
        const item = cardItems[index];
        const card = item.card;
        const x = finalX[index];
        card.dataset.currentX = x;

        const absX = Math.abs(x);
        const progress = Math.min(absX / spacing, 1.0);
        const scale = scales[index]; 

        // Assombrissement en profondeur harmonisé (1.0 - progress * 0.35)
        const brightness = 1.0 - progress * 0.35;
        card.style.filter = `brightness(${brightness})`;

        // Recul de profondeur 3D harmonisé et zoom arrière au scroll
        const zDepth = progress * -80;
        const finalZ = 150 + zDepth + currentSpeedDepth;

        // Positionnement à plat pour garder le contact parfait
        card.style.transform = `translateX(${x}px) translateZ(${finalZ}px) scale(${scale})`;

        // On calcule dynamiquement le z-index basé sur l'échelle de la carte.
        card.style.zIndex = Math.round(scale * 100);

        // Recherche du projet actif pour la légende
        if (absX < minDistanceToCenter) {
            minDistanceToCenter = absX;
            closestCard = card;
        }
    }

    // Gestion de la classe active et attribution dynamique du nom de transition
    for (let index = 0; index < cardCount; index++) {
        const item = cardItems[index];
        const card = item.card;
        const img = item.img;

        if (card === closestCard) {
            if (!card.classList.contains('active')) {
                card.classList.add('active');
                updateActiveProjectData(card);
            }
            if (img && img.style.viewTransitionName !== 'project-image') {
                img.style.viewTransitionName = 'project-image';
            }
        } else {
            card.classList.remove('active');
            if (img && img.style.viewTransitionName !== '') {
                img.style.viewTransitionName = '';
            }
        }
    }

    requestAnimationFrame(animate);
}

animate();