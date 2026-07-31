// ==========================================================================
// DARBON STUDIO | CAROUSEL & INTRO LOADER SYSTEM
// ==========================================================================

// --------------------------------------------------------------------------
// 1. CONFIGURATION ET VARIABLES GLOBALES
// --------------------------------------------------------------------------
const track = document.querySelector('.carousel-track');
const cards = document.querySelectorAll('.card');
const featuredImg = document.getElementById('featured-image');

// Éléments du bloc d'informations central
const activeTitle = document.getElementById('active-title');
const activeCategory = document.getElementById('active-category');

// Nombre de cartes et dimensions de base
const cardCount = cards.length;
let cardBaseWidth = 500;
let cardBaseHeight = 325;
let spacing = 425;
let totalWidth = cardCount * spacing;
let halfTotalWidth = totalWidth / 2;

// --------------------------------------------------------------------------
// 2. ADAPTATION RESPONSIVE DE LA TAILLE DES CARTES
// --------------------------------------------------------------------------
function updateDimensions() {
    let maxW = 400;
    let widthFactor = 0.42;
    
    if (window.innerWidth >= 1600) {
        maxW = 700;
        widthFactor = 0.50;
    } else if (window.innerWidth >= 1200) {
        maxW = 800;
        widthFactor = 0.48;
    }
    
    const computedW = Math.min(maxW, Math.max(320, Math.min(window.innerWidth * widthFactor, (window.innerHeight - 180) * 1.35)));
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

// --------------------------------------------------------------------------
// 3. ÉTATS DE PHYSIQUE, D'INERTIE ET D'ANIMATION
// --------------------------------------------------------------------------
let targetX = 0;
let currentX = 0;
let previousX = 0;
const scrollSensitivity = 0.08;

// Spring Snapping
let isScrolling = false;
let scrollTimeout = null;
let isNavigating = false;
let springVelocity = 0;
const springStiffness = 0.22;
const springDamping = 0.52;

// Drag / Touch
let isDragging = false;
let startX = 0;
let startCurrentX = 0;
let hasDragged = false;

// Inertie cinétique de glissement (Flick / Throw)
let inertiaVelocity = 0;
let lastPointerX = 0;
let dragVelocity = 0;
const friction = 0.90;

let currentSpeedDepth = 0;


// Cache DOM pour optimiser les performances (60 FPS)
const cardItems = Array.from(cards).map((card) => {
    const img = card.querySelector('.card-media img');
    if (img) {
        card.dataset.imgSrc = img.src;
    }
    
    // Génération dynamique des textes de survol au-dessus de l'image (cartes non-actives)
    const title = card.getAttribute('data-title').replace(/<br\s*\/?>/gi, ' ');
    const category = card.getAttribute('data-category');
    
    const textContainer = document.createElement('div');
    textContainer.className = 'card-hover-text';
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'hover-title';
    titleSpan.textContent = title;
    
    const catSpan = document.createElement('span');
    catSpan.className = 'hover-category';
    catSpan.textContent = category;
    
    textContainer.appendChild(titleSpan);
    textContainer.appendChild(catSpan);
    card.appendChild(textContainer);
    
    return { card, img };
});

// Buffers de calcul réutilisables (anti Garbage Collection)
const rawX = new Float32Array(cardCount);
const scales = new Float32Array(cardCount);
const widths = new Float32Array(cardCount);
const finalX = new Float32Array(cardCount);

const hoverStates = new Uint8Array(cardCount);
const hoverMultipliers = new Float32Array(cardCount).fill(1.0);

cardItems.forEach((item, index) => {
    item.card.addEventListener('mouseenter', () => { hoverStates[index] = 1; });
    item.card.addEventListener('mouseleave', () => { hoverStates[index] = 0; });
});

// --------------------------------------------------------------------------
// 5. GESTION DU SCROLL ET DU DRAG (INTERACTIONS)
// --------------------------------------------------------------------------
window.addEventListener('wheel', (event) => {
    if (isNavigating) return;

    event.preventDefault();
    isScrolling = true;
    
    inertiaVelocity -= event.deltaY * scrollSensitivity;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (Math.abs(inertiaVelocity) < 0.4) {
            isScrolling = false;
        }
    }, 80); 
}, { passive: false });

window.addEventListener('mousedown', (event) => {
    if (isNavigating) return;
    isDragging = true;
    hasDragged = false;
    startX = event.clientX;
    lastPointerX = event.clientX;
    startCurrentX = targetX;
    dragVelocity = 0;
    inertiaVelocity = 0;
    document.body.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    const deltaX = event.clientX - startX;
    
    if (Math.abs(deltaX) > 4) {
        hasDragged = true;
    }

    dragVelocity = event.clientX - lastPointerX;
    lastPointerX = event.clientX;

    targetX = startCurrentX + deltaX * 1.5;
});

window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = 'default';

    if (hasDragged) {
        inertiaVelocity = dragVelocity * 1.2;
    }
});

// Support Tactile (Mobile & Tablette)
window.addEventListener('touchstart', (event) => {
    if (isNavigating) return;
    if (event.touches.length === 1) {
        isDragging = true;
        hasDragged = false;
        startX = event.touches[0].clientX;
        lastPointerX = event.touches[0].clientX;
        startCurrentX = targetX;
        dragVelocity = 0;
        inertiaVelocity = 0;
    }
}, { passive: true });

window.addEventListener('touchmove', (event) => {
    if (!isDragging || event.touches.length !== 1) return;
    const currentXTouch = event.touches[0].clientX;
    const deltaX = currentXTouch - startX;

    if (Math.abs(deltaX) > 4) {
        hasDragged = true;
    }

    dragVelocity = currentXTouch - lastPointerX;
    lastPointerX = currentXTouch;

    targetX = startCurrentX + deltaX * 1.5;
}, { passive: true });

window.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    if (hasDragged) {
        inertiaVelocity = dragVelocity * 1.2;
    }
});

// Contrôles Flèches Clavier
window.addEventListener('keydown', (event) => {
    if (isNavigating) return;
    if (event.key === 'ArrowRight') {
        isScrolling = true;
        targetX -= spacing;
        setTimeout(() => { isScrolling = false; }, 300);
    } else if (event.key === 'ArrowLeft') {
        isScrolling = true;
        targetX += spacing;
        setTimeout(() => { isScrolling = false; }, 300);
    }
});

// --------------------------------------------------------------------------
// 6. NAVIGATION VERS LA PAGE PROJET (VIEW TRANSITION)
// --------------------------------------------------------------------------
function openProject(card) {
    if (isNavigating || hasDragged) return;
    isNavigating = true;

    document.body.style.pointerEvents = 'none';

    const title = card.getAttribute('data-title') || '';
    const category = card.getAttribute('data-category') || '';
    const date = card.getAttribute('data-date') || '';
    const client = card.getAttribute('data-client') || '';
    const description = card.getAttribute('data-description') || '';
    const imageSrc = card.dataset.imgSrc || '';

    const params = new URLSearchParams({
        title,
        category,
        date,
        client,
        description,
        image: imageSrc
    });

    const targetUrl = `project.html?${params.toString()}`;

    if (document.startViewTransition) {
        document.startViewTransition(() => {
            window.location.href = targetUrl;
        });
    } else {
        window.location.href = targetUrl;
    }
}

cards.forEach((card) => {
    card.addEventListener('click', () => {
        if (!hasDragged) {
            openProject(card);
        }
    });
});

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

window.addEventListener('pageshow', (event) => {
    isNavigating = false;
    document.body.style.pointerEvents = 'auto';

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

// --------------------------------------------------------------------------
// 7. MISE À JOUR DYNAMIQUE DU TEXTE CENTRAL
// --------------------------------------------------------------------------
function updateActiveProjectData(activeCard) {
    const newTitle = activeCard.getAttribute('data-title');
    const newCategory = activeCard.getAttribute('data-category');

    if (activeTitle.innerHTML !== newTitle) {
        activeTitle.style.opacity = 0;
        activeCategory.style.opacity = 0;

        setTimeout(() => {
            const textClean = newTitle.replace(/<br\s*\/?>/gi, ' ');
            const words = textClean.split(' ');
            
            if (words.length >= 2) {
                const firstWord = words[0];
                const restOfWords = words.slice(1).join(' ');
                activeTitle.innerHTML = `<span class="title-bricolage">${firstWord}</span> <span class="title-cormorant">${restOfWords}</span>`;
            } else {
                activeTitle.innerHTML = `<span class="title-bricolage">${textClean}</span>`;
            }

            activeCategory.innerHTML = newCategory;
            
            activeTitle.style.opacity = 1;
            activeCategory.style.opacity = 1;
        }, 300);
    }
}

// --------------------------------------------------------------------------
// 8. BOUCLE D'ANIMATION ET RENDU 3D CAROUSEL (60 FPS)
// --------------------------------------------------------------------------
function animate() {
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

    currentX += (targetX - currentX) * 0.16;

    const velocity = currentX - previousX;
    previousX = currentX;

    const maxVelocity = 10;
    const clampedVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity));

    if (!isScrolling && !isDragging && inertiaVelocity === 0) {
        const nearestSnap = Math.round(targetX / spacing) * spacing;
        const displacement = nearestSnap - targetX;
        const force = displacement * springStiffness;
        
        springVelocity += force;
        springVelocity *= springDamping;
        targetX += springVelocity;
    } else {
        springVelocity = 0;
    }

    let targetSpeedDepth = 0;
    if (isScrolling || isDragging) {
        targetSpeedDepth = -Math.min(Math.abs(clampedVelocity) * 5, 50);
    }
    currentSpeedDepth += (targetSpeedDepth - currentSpeedDepth) * 0.15;

    let closestCard = null;
    let minDistanceToCenter = Infinity;

    const gap = 0;
    const maxScale = 1.1;
    const minScale = 0.55;
    const scaleDiff = maxScale - minScale;

    for (let index = 0; index < cardCount; index++) {
        let x = (index * spacing) + currentX;

        x = x % totalWidth;
        if (x < -halfTotalWidth) x += totalWidth;
        if (x > halfTotalWidth) x -= totalWidth;

        rawX[index] = x;

        const absX = Math.abs(x);
        const progress = Math.min(absX / spacing, 1.0);
        
        const baseScale = minScale + (1.0 - progress) * scaleDiff;
        
        const targetHover = hoverStates[index] ? 1.02 : 1.0;
        hoverMultipliers[index] += (targetHover - hoverMultipliers[index]) * 0.1;
        
        const finalScale = baseScale * hoverMultipliers[index];
        scales[index] = finalScale;
        widths[index] = cardBaseWidth * finalScale;
    }

    let closestIndex = 0;
    let minDistance = Infinity;
    for (let index = 0; index < cardCount; index++) {
        const absDist = Math.abs(rawX[index]);
        if (absDist < minDistance) {
            minDistance = absDist;
            closestIndex = index;
        }
    }

    finalX[closestIndex] = rawX[closestIndex];

    for (let k = 1; k <= 3; k++) {
        const i = (closestIndex + k) % cardCount;
        const prev = (closestIndex + k - 1) % cardCount;
        finalX[i] = finalX[prev] + widths[prev] / 2 + widths[i] / 2 + gap;
    }

    for (let k = 1; k <= 3; k++) {
        const i = (closestIndex - k + cardCount) % cardCount;
        const next = (closestIndex - k + 1 + cardCount) % cardCount;
        finalX[i] = finalX[next] - widths[next] / 2 - widths[i] / 2 - gap;
    }


    for (let index = 0; index < cardCount; index++) {
        const item = cardItems[index];
        const card = item.card;
        const x = finalX[index];
        card.dataset.currentX = x;

        const absX = Math.abs(x);
        const progress = Math.min(absX / spacing, 1.0);
        const scale = scales[index];

        const brightness = 1.0 - progress * 0.35;
        card.style.filter = `brightness(${brightness})`;

        const zDepth = 0; // Removed progress-based zDepth to fix perspective X overlap
        const renderZ = 150 + zDepth + currentSpeedDepth;
        const renderX = x;
        const renderScale = scale;

        card.style.transform = `translateX(${renderX}px) translateZ(${renderZ}px) scale(${renderScale})`;
        card.style.zIndex = Math.round(scale * 100);
        card.style.opacity = 1.0;

        if (absX < minDistanceToCenter) {
            minDistanceToCenter = absX;
            closestCard = card;
        }
    }

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

// Lancement de la boucle de rendu
animate();
