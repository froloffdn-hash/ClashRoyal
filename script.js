// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Развернуть приложение на весь экран

// Состояние игры
let gameState = {
    player: {
        id: tg.initDataUnsafe.user?.id || Date.now(),
        name: tg.initDataUnsafe.user?.first_name || 'Игрок',
        level: 1,
        exp: 0,
        gold: 1000,
        gems: 50,
        trophies: 1500,
        energy: 100,
        wins: 0,
        losses: 0,
        deck: [],
        collection: {},
        lastChest: null
    },
    currentScreen: 'mainMenu',
    battle: {
        inProgress: false,
        elixir: 10,
        maxElixir: 10,
        cardsInHand: [],
        selectedCard: null
    }
};

// Карты игры
const CARDS = {
    'арчеры': { name: 'Арчеры', cost: 3, rarity: 'common', type: 'troop', damage: 100, health: 200 },
    'рыцари': { name: 'Рыцари', cost: 3, rarity: 'common', type: 'troop', damage: 150, health: 300 },
    'гоблины': { name: 'Гоблины', cost: 2, rarity: 'common', type: 'troop', damage: 80, health: 100 },
    'скелеты': { name: 'Скелеты', cost: 1, rarity: 'common', type: 'troop', damage: 50, health: 80 },
    'огненный шар': { name: 'Огненный шар', cost: 4, rarity: 'rare', type: 'spell', damage: 300, health: 0 },
    'гигант': { name: 'Гигант', cost: 5, rarity: 'rare', type: 'troop', damage: 200, health: 2000 },
    'принц': { name: 'Принц', cost: 5, rarity: 'epic', type: 'troop', damage: 400, health: 500 },
    'ледяной волшебник': { name: 'Ледяной волшебник', cost: 3, rarity: 'legendary', type: 'troop', damage: 150, health: 300 }
};

// Сундуки
const CHESTS = {
    'wooden': { name: 'Деревянный', cost: 0, minCards: 3, maxCards: 5, gold: 50 },
    'silver': { name: 'Серебряный', cost: 100, minCards: 5, maxCards: 8, gold: 100 },
    'golden': { name: 'Золотой', cost: 10, costType: 'gems', minCards: 8, maxCards: 12, gold: 200 },
    'magical': { name: 'Волшебный', cost: 50, costType: 'gems', minCards: 10, maxCards: 15, gold: 500 }
};

// Инициализация игры
function initGame() {
    loadGameState();
    updateUI();
    setupEventListeners();
    startElixirTimer();
    startChestTimer();
}

// Загрузка состояния игры
function loadGameState() {
    const saved = localStorage.getItem('clashRoyaleState');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState.player = { ...gameState.player, ...parsed.player };
    }
    
    // Инициализация начальной колоды и коллекции
    if (gameState.player.deck.length === 0) {
        gameState.player.deck = ['арчеры', 'рыцари', 'гоблины', 'скелеты'];
        initializeCollection();
    }
    
    updateUI();
}

// Сохранение состояния игры
function saveGameState() {
    localStorage.setItem('clashRoyaleState', JSON.stringify(gameState));
}

// Инициализация коллекции
function initializeCollection() {
    const initialCards = ['арчеры', 'рыцари', 'гоблины', 'скелеты', 'огненный шар', 'гигант'];
    gameState.player.collection = {};
    
    initialCards.forEach(cardId => {
        gameState.player.collection[cardId] = {
            count: 1,
            level: 1
        };
    });
}

// Обновление интерфейса
function updateUI() {
    const p = gameState.player;
    
    // Обновление ресурсов
    document.getElementById('gold').textContent = p.gold;
    document.getElementById('gems').textContent = p.gems;
    document.getElementById('trophies').textContent = p.trophies;
    document.getElementById('energy').textContent = `${p.energy}/100`;
    
    // Обновление информации игрока
    document.getElementById('playerName').textContent = p.name;
    document.getElementById('playerLevel').textContent = p.level;
    
    // Обновление статистики
    document.getElementById('wins').textContent = p.wins;
    document.getElementById('losses').textContent = p.losses;
    const winrate = p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0;
    document.getElementById('winrate').textContent = `${winrate}%`;
    
    // Обновление экранов
    if (gameState.currentScreen === 'deck') {
        updateDeckDisplay();
        updateCollectionDisplay();
    } else if (gameState.currentScreen === 'collection') {
        updateCardCollection();
    } else if (gameState.currentScreen === 'battleScreen') {
        updateBattleUI();
    }
}

// Показать экран
function showScreen(screenId) {
    // Скрыть все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показать выбранный экран
    document.getElementById(screenId).classList.add('active');
    gameState.currentScreen = screenId;
    
    // Обновить активную кнопку в навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (screenId === 'mainMenu') {
        document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
    }
    
    updateUI();
}

// Битва
function startQuickBattle() {
    if (gameState.player.energy < 10) {
        showNotification('Недостаточно энергии!');
        return;
    }
    
    gameState.player.energy -= 10;
    gameState.currentScreen = 'battleScreen';
    showScreen('battleScreen');
    initBattle();
}

function initBattle() {
    gameState.battle = {
        inProgress: true,
        elixir: 5,
        maxElixir: 10,
        cardsInHand: getRandomHand(),
        selectedCard: null
    };
    
    updateBattleUI();
    startBattleLoop();
}

function getRandomHand() {
    const hand = [];
    const deck = gameState.player.deck;
    
    for (let i = 0; i < 4 && deck.length > 0; i++) {
        const randomCard = deck[Math.floor(Math.random() * deck.length)];
        hand.push(randomCard);
    }
    
    return hand;
}

function updateBattleUI() {
    const battle = gameState.battle;
    
    // Обновление эликсира
    document.getElementById('elixirCount').textContent = battle.elixir;
    document.getElementById('elixirFill').style.width = `${(battle.elixir / battle.maxElixir) * 100}%`;
    
    // Обновление руки
    const playerHand = document.getElementById('playerHand');
    playerHand.innerHTML = '';
    
    battle.cardsInHand.forEach(cardId => {
        const card = CARDS[cardId];
        if (!card) return;
        
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-name">${card.name}</div>
        `;
        
        cardElement.onclick = () => playCard(cardId);
        playerHand.appendChild(cardElement);
    });
}

function playCard(cardId) {
    const card = CARDS[cardId];
    const battle = gameState.battle;
    
    if (battle.elixir < card.cost) {
        showNotification('Недостаточно эликсира!');
        return;
    }
    
    battle.elixir -= card.cost;
    updateBattleUI();
    
    // Эффект размещения карты
    showNotification(`${card.name} размещен!`);
    
    // Обновить руку
    const index = battle.cardsInHand.indexOf(cardId);
    if (index > -1) {
        battle.cardsInHand.splice(index, 1);
        
        // Добавить новую карту из колоды
        if (gameState.player.deck.length > 0) {
            const randomCard = gameState.player.deck[Math.floor(Math.random() * gameState.player.deck.length)];
            battle.cardsInHand.push(randomCard);
        }
    }
    
    updateBattleUI();
}

function startBattleLoop() {
    if (!gameState.battle.inProgress) return;
    
    // Увеличение эликсира
    if (gameState.battle.elixir < gameState.battle.maxElixir) {
        gameState.battle.elixir += 0.1;
        updateBattleUI();
    }
    
    // Проверка конца битвы (упрощенно)
    setTimeout(() => {
        const result = simulateBattle();
        endBattle(result);
    }, 60000); // 60 секунд на битву
}

function simulateBattle() {
    // Упрощенная симуляция боя
    const winChance = gameState.player.trophies > 1600 ? 0.4 : 0.6;
    return Math.random() < winChance ? 'win' : 'lose';
}

function endBattle(result) {
    gameState.battle.inProgress = false;
    
    if (result === 'win') {
        gameState.player.wins++;
        gameState.player.trophies += 30;
        gameState.player.gold += 50;
        gameState.player.exp += 100;
        
        showNotification('🎉 Победа! +30 трофеев, +50 золота');
    } else {
        gameState.player.losses++;
        gameState.player.trophies = Math.max(0, gameState.player.trophies - 20);
        gameState.player.gold += 10;
        gameState.player.exp += 50;
        
        showNotification('💔 Поражение! -20 трофеев, +10 золота');
    }
    
    // Проверка повышения уровня
    checkLevelUp();
    
    saveGameState();
    updateUI();
    showScreen('mainMenu');
}

// Колода
function updateDeckDisplay() {
    const deckDisplay = document.getElementById('currentDeck');
    deckDisplay.innerHTML = '';
    
    gameState.player.deck.forEach(cardId => {
        const card = CARDS[cardId];
        if (!card) return;
        
        const cardElement = document.createElement('div');
        cardElement.className = 'deck-card';
        cardElement.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-rarity ${card.rarity}">${getRarityName(card.rarity)}</div>
        `;
        
        deckDisplay.appendChild(cardElement);
    });
}

function updateCollectionDisplay() {
    const collectionDisplay = document.getElementById('collectionCards');
    collectionDisplay.innerHTML = '';
    
    Object.entries(gameState.player.collection).forEach(([cardId, cardData]) => {
        const card = CARDS[cardId];
        if (!card) return;
        
        const cardElement = document.createElement('div');
        cardElement.className = 'collection-card';
        cardElement.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-rarity ${card.rarity}">${getRarityName(card.rarity)}</div>
            <div class="card-count">x${cardData.count}</div>
        `;
        
        cardElement.onclick = () => addToDeck(cardId);
        
        collectionDisplay.appendChild(cardElement);
    });
}

function addToDeck(cardId) {
    if (gameState.player.deck.length >= 8) {
        showNotification('Колода полна! Максимум 8 карт.');
        return;
    }
    
    if (!gameState.player.deck.includes(cardId)) {
        gameState.player.deck.push(cardId);
        updateDeckDisplay();
        saveGameState();
        showNotification(`${CARDS[cardId].name} добавлена в колоду`);
    }
}

function toggleDeckEdit() {
    const saveBtn = document.querySelector('.save-btn');
    saveBtn.style.display = saveBtn.style.display === 'none' ? 'block' : 'none';
}

function saveDeck() {
    if (gameState.player.deck.length < 4) {
        showNotification('В колоде должно быть минимум 4 карты!');
        return;
    }
    
    saveGameState();
    showNotification('Колода сохранена!');
}

// Коллекция
function updateCardCollection() {
    const collectionGrid = document.getElementById('cardCollection');
    collectionGrid.innerHTML = '';
    
    const rarityFilter = document.getElementById('rarityFilter').value;
    
    Object.entries(CARDS).forEach(([cardId, card]) => {
        if (rarityFilter !== 'all' && card.rarity !== rarityFilter) return;
        
        const cardData = gameState.player.collection[cardId] || { count: 0, level: 0 };
        
        const cardElement = document.createElement('div');
        cardElement.className = 'collection-card';
        cardElement.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-rarity ${card.rarity}">${getRarityName(card.rarity)}</div>
            <div class="card-count">${cardData.count > 0 ? `x${cardData.count}` : 'Нет'}</div>
        `;
        
        collectionGrid.appendChild(cardElement);
    });
}

function filterCards() {
    updateCardCollection();
}

function getRarityName(rarity) {
    const names = {
        'common': 'Обычная',
        'rare': 'Редкая',
        'epic': 'Эпическая',
        'legendary': 'Легендарная'
    };
    return names[rarity] || rarity;
}

// Сундуки
function openChest(chestType) {
    const chest = CHESTS[chestType];
    
    // Проверка стоимости
    if (chest.costType === 'gems') {
        if (gameState.player.gems < chest.cost) {
            showNotification('Недостаточно самоцветов!');
            return;
        }
        gameState.player.gems -= chest.cost;
    } else {
        if (gameState.player.gold < chest.cost) {
            showNotification('Недостаточно золота!');
            return;
        }
        gameState.player.gold -= chest.cost;
    }
    
    // Открытие сундука
    gameState.currentScreen = 'chestOpening';
    showScreen('chestOpening');
    
    // Анимация открытия
    setTimeout(() => {
        revealChestRewards(chest);
    }, 2000);
}

function revealChestRewards(chest) {
    const cardsReveal = document.getElementById('cardsReveal');
    cardsReveal.innerHTML = '';
    
    // Золото
    gameState.player.gold += chest.gold;
    
    // Карты
    const numCards = Math.floor(Math.random() * (chest.maxCards - chest.minCards + 1)) + chest.minCards;
    const rewards = [];
    
    for (let i = 0; i < numCards; i++) {
        const cardIds = Object.keys(CARDS);
        const randomCardId = cardIds[Math.floor(Math.random() * cardIds.length)];
        
        // Добавить в коллекцию
        if (!gameState.player.collection[randomCardId]) {
            gameState.player.collection[randomCardId] = { count: 1, level: 1 };
        } else {
            gameState.player.collection[randomCardId].count++;
        }
        
        rewards.push(randomCardId);
    }
    
    // Показать награды
    rewards.forEach(cardId => {
        const card = CARDS[cardId];
        const cardElement = document.createElement('div');
        cardElement.className = 'collection-card';
        cardElement.innerHTML = `
            <div class="card-name">${card.name}</div>
            <div class="card-rarity ${card.rarity}">${getRarityName(card.rarity)}</div>
        `;
        cardsReveal.appendChild(cardElement);
    });
    
    showNotification(`Получено: ${chest.gold} золота и ${numCards} карт!`);
    saveGameState();
    updateUI();
}

function startChestTimer() {
    setInterval(() => {
        // Обновление таймера сундуков
        const timerElement = document.getElementById('chestTimer');
        if (timerElement) {
            const now = new Date();
            const seconds = now.getSeconds();
            timerElement.querySelector('span').textContent = 
                `00:${seconds < 10 ? '0' : ''}${60 - seconds}`;
        }
    }, 1000);
}

// Магазин
function buyGold(amount) {
    if (gameState.player.gems < 10) {
        showNotification('Недостаточно самоцветов!');
        return;
    }
    
    gameState.player.gems -= 10;
    gameState.player.gold += amount;
    saveGameState();
    updateUI();
    showNotification(`Куплено ${amount} золота!`);
}

function buyGems(amount) {
    if (gameState.player.gold < 1000) {
        showNotification('Недостаточно золота!');
        return;
    }
    
    gameState.player.gold -= 1000;
    gameState.player.gems += amount;
    saveGameState();
    updateUI();
    showNotification(`Куплено ${amount} самоцветов!`);
}

function refillEnergy() {
    if (gameState.player.gems < 5) {
        showNotification('Недостаточно самоцветов!');
        return;
    }
    
    gameState.player.gems -= 5;
    gameState.player.energy = 100;
    saveGameState();
    updateUI();
    showNotification('Энергия восстановлена!');
}

function buyChest(chestType) {
    openChest(chestType);
}

// Уровни
function checkLevelUp() {
    const expNeeded = gameState.player.level * 100;
    
    while (gameState.player.exp >= expNeeded) {
        gameState.player.exp -= expNeeded;
        gameState.player.level++;
        
        // Награда за уровень
        gameState.player.gold += gameState.player.level * 100;
        gameState.player.gems += gameState.player.level * 5;
        
        showNotification(`🎊 Уровень ${gameState.player.level}!`);
    }
}

// Таймер эликсира
function startElixirTimer() {
    setInterval(() => {
        if (gameState.player.energy < 100) {
            gameState.player.energy = Math.min(100, gameState.player.energy + 1);
            updateUI();
        }
    }, 30000); // +1 энергия каждые 30 секунд
}

// Уведомления
function showNotification(text) {
    const notification = document.getElementById('notification');
    const textElement = document.getElementById('notificationText');
    
    textElement.textContent = text;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки навигации
    document.querySelectorAll('.nav-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const screens = ['mainMenu', 'battle', 'deck', 'chest'];
            if (screens[index]) {
                showScreen(screens[index]);
            }
        });
    });
}

// Запуск игры при загрузке
document.addEventListener('DOMContentLoaded', initGame);