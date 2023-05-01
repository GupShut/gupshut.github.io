{
const options: URLSearchParams = new URL(location.toString()).searchParams
let modified: boolean = false
options.forEach(() => modified = true)
const damage: boolean = "true" != options.get("inv")
const speed: number = +options.get("speed")! || 18
const bulletDelay: number = +options.get("delay")! || 900

const cnv: HTMLCanvasElement = document.querySelector('#game')!
const ctx = cnv.getContext('2d')!
const wrapper: HTMLDivElement = document.querySelector('#overlay-wrapper')!
const startButton: HTMLButtonElement = document.querySelector('#start')!
const lsButton: HTMLButtonElement = document.querySelector('#activate-ls')!
const fullscreenButton: HTMLButtonElement = document.querySelector('#fullscreen')!
const scoreText: HTMLSpanElement = document.querySelector('#score')!
const highScoreText: HTMLSpanElement = document.querySelector('#high-score')!

let lsConfirmed: boolean = null != localStorage.getItem('gup-als')
let highScore: number = 0
let run: boolean = false
let paused: boolean = false
let showClickText: boolean = false
let mouseX: number = -50
let mouseY: number = -50
let score: number = 0

if (lsConfirmed) {
    lsButton.style.display = 'none'
    highScore = Number.parseInt(localStorage.getItem('gup-high')!, 32)
    highScoreText.innerHTML = (highScore/3).toString()
} else {
    highScoreText.style.display = 'none'
}

interface Enemy {
    x: number,
    y: number,
    rot: number
}
const enemy: Enemy = {
    x: 0,
    y: 0,
    rot: 0
}

interface Coin {
    x: number,
    y: number
}
const coin: Coin = {
    x: -100,
    y: -100
}

adjustCanvas()

let bullets: Bullet[] = []
let shootInt: NodeJS.Timer 

gameLoop()

function gameLoop() {
    //^ Prerender Logic

    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'

    requestAnimationFrame(gameLoop)

    if (navigator.getGamepads()[0]) {

        if (navigator.getGamepads()[0]?.buttons[8].pressed && paused) {
            relocateCoin()
    
            addEventListener('mousemove', mouseHandler)
            addEventListener('touchstart', touchHandler)
            addEventListener('touchmove', touchHandler)
            addEventListener('touchend', touchHandler)
    
            shootInt = setInterval(() => bullets.push(new Bullet(enemy.x, enemy.y, enemy.rot)), bulletDelay)
    
            run = true
            paused = false
        }

        if (navigator.getGamepads()[0]?.buttons[9].pressed && !paused) {
            if (!run) return
    
            run = false
            clearInterval(shootInt)
            
            removeEventListener('mousemove', mouseHandler)
            removeEventListener('touchstart', touchHandler)
            removeEventListener('touchmove', touchHandler)
            removeEventListener('touchend', touchHandler)
    
            paused = true
        }

        if (!run) {
            if (navigator.getGamepads()[0]?.buttons[0].pressed && !paused) {
                init()
                start()
            }
        } else {
            

            if (mouseX < 0) mouseX = 0
            if (mouseX > innerWidth) mouseX = mouseX = innerWidth
            if (mouseY < 0) mouseY = 0
            if (mouseY > innerHeight) mouseY = mouseY = innerHeight

            if (navigator.getGamepads()[0]?.buttons[2].pressed) {
                mouseX += 10*navigator.getGamepads()[0]?.axes[0]!
                mouseY += 10*navigator.getGamepads()[0]?.axes[1]!
            } else {
                mouseX += 5*navigator.getGamepads()[0]?.axes[0]!
                mouseY += 5*navigator.getGamepads()[0]?.axes[1]!
            }
        }
    }

    // enemy
    
    enemy.rot = Math.atan2(mouseY-innerHeight/2, mouseX-innerWidth/2)
    enemy.x = innerWidth/2 + Math.cos(enemy.rot) * (50 + 2)
    enemy.y = innerHeight/2 + Math.sin(enemy.rot) * (50 + 2)
    
    // coin

    if (distance(mouseX-coin.x, mouseY-coin.y) <= 10+25) scoreCoin()
    
    //^ Rendering

    // background
    ctx.beginPath()
    ctx.rect(0, 0, innerWidth, innerHeight)
    ctx.fillStyle = 'rgb(0, 0, 40)'
    ctx.fill()
    ctx.closePath()

    // enemy bg
    ctx.beginPath()
    ctx.arc(innerWidth/2, innerHeight/2, 75, 0, 2 * Math.PI)
    ctx.fillStyle = 'white'
    ctx.fill()
    ctx.closePath()

    // enemy

    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, 25, 0, 2 * Math.PI)
    ctx.fillStyle = 'black'
    ctx.fill()
    ctx.closePath()

    // player
    ctx.beginPath()
    ctx.arc(mouseX, mouseY, 25, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgb(100, 255, 0)'
    ctx.fill()
    ctx.closePath()

    // bullets

    for (let bulletId in bullets) {
        let bullet = bullets[bulletId]

        ctx.beginPath()

        if (run) {
            bullet.frame()

            if (bullet.x-5 < 0 || bullet.x+5 > innerWidth || bullet.y-5 < 0 || bullet.y+5 > innerHeight) {
                bullets.splice(+bulletId, 1)
                continue
            }

            if (distance(mouseX-bullet.x, mouseY-bullet.y) <= 25+5 && damage)
                gameOver()
        }

        ctx.arc(bullet.x, bullet.y, 5, 0, 2 * Math.PI)
        ctx.fillStyle = 'red'
        ctx.fill()
        ctx.closePath()
    }

    // score

    ctx.beginPath()
    ctx.font = '64px Lucida Grande, Lucida Console Regular, Arial'
    ctx.fillStyle = 'yellow'
    ctx.fillText(String(score/3), 32, 64)
    ctx.closePath()

    // coin

    ctx.beginPath()
    ctx.fillStyle = 'yellow'
    ctx.arc(coin.x, coin.y, 10, 0, 2 * Math.PI)
    ctx.fill()
    ctx.closePath()

    // modified text

    if (modified) {
        ctx.beginPath()
        ctx.font = '16px Lucida Grande, Lucida Console Regular, Arial'
        ctx.fillStyle = 'lightgray'
        ctx.fillText("Modified", 32, innerHeight-16)
        ctx.closePath()
    }

    // pause text

    if (paused) {
        ctx.beginPath()
        ctx.font = '64px Lucida Grande, Lucida Console Regular, Arial'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'red'
        ctx.fillText("Game Paused", innerWidth/2, 150)
        ctx.closePath()
    }

    // click to start text

    if (showClickText) {
        ctx.beginPath()
        ctx.font = '64px Lucida Grande, Lucida Console Regular, Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'red'
        ctx.fillText("Click to Start", innerWidth/2, innerHeight/2)
        ctx.closePath()
    }

    //^ Postrender Logic

    // player enter eye

    if (distance(mouseX-innerWidth/2, mouseY-innerHeight/2) <= 25+75 && damage)
        gameOver()
}

class Bullet {
    x: number = 0
    y: number = 0
    rot: number = 0

    constructor(x: number, y: number, rot: number) {
        this.x = x
        this.y = y
        this.rot = rot
    }

    frame() {
        this.x += speed * Math.cos(this.rot)
        this.y += speed * Math.sin(this.rot)
    }
}

function adjustCanvas() {
    cnv.width = innerWidth
    cnv.height = innerHeight
    relocateCoin()
}

function pauseGame(e: KeyboardEvent) {
    if (e.key != 'Escape') return
    e.preventDefault()
    if (paused) {
        relocateCoin()

        addEventListener('mousemove', mouseHandler)
        addEventListener('touchstart', touchHandler)
        addEventListener('touchmove', touchHandler)
        addEventListener('touchend', touchHandler)

        shootInt = setInterval(() => bullets.push(new Bullet(enemy.x, enemy.y, enemy.rot)), bulletDelay)

        run = true
        paused = false
    } else {
        if (!run) return

        run = false
        clearInterval(shootInt)
        
        removeEventListener('mousemove', mouseHandler)
        removeEventListener('touchstart', touchHandler)
        removeEventListener('touchmove', touchHandler)
        removeEventListener('touchend', touchHandler)

        paused = true
    }
}

function init() {
    coin.x = -100
    coin.y = -100
    mouseX = -50
    mouseY = -50
    bullets = []
    score = 0

    wrapper.style.display = 'none'

    showClickText = true
    cnv.addEventListener('click', start)
}

function start() {
    cnv.removeEventListener('click', start)
    showClickText = false
    relocateCoin()

    addEventListener('mousemove', mouseHandler)
    addEventListener('touchstart', touchHandler)
    addEventListener('touchmove', touchHandler)
    addEventListener('touchend', touchHandler)

    shootInt = setInterval(() => bullets.push(new Bullet(enemy.x, enemy.y, enemy.rot)), bulletDelay)

    run = true
}

function scoreCoin() {
    score += 3
    relocateCoin()
}

function relocateCoin() {
    coin.x = Math.floor(Math.random()*(innerWidth-20*2))+20
    coin.y = Math.floor(Math.random()*(innerHeight-20*2))+20

    if (distance(coin.x-innerWidth/2, coin.y-innerHeight/2) <= 10+75 || distance(mouseX-coin.x, mouseY-coin.y) <= 10+25) relocateCoin()
}

function gameOver() {
    if (!run) return

    run = false
    clearInterval(shootInt)

    removeEventListener('mousemove', mouseHandler)
    removeEventListener('touchstart', touchHandler)
    removeEventListener('touchmove', touchHandler)
    removeEventListener('touchend', touchHandler)

    if (score/3 > highScore/3 && !modified) {
        highScore = score
        highScoreText.innerText = (highScore/3).toString()

        if (lsConfirmed) localStorage.setItem('gup-high', highScore.toString(32))
    }

    scoreText.innerHTML = (score / 3).toString()
    setTimeout(() => wrapper.style.display = 'flex', 1000)
}

addEventListener('resize', adjustCanvas)
addEventListener('keydown', pauseGame)

startButton.addEventListener('click', init)
fullscreenButton.addEventListener('click', () => document.body.requestFullscreen())
lsButton.addEventListener('click', () => {
    lsConfirmed = confirm('Allow to save game related data to your device')

    if (lsConfirmed) {
        localStorage.setItem('gup-als', 'confirmed')
        localStorage.setItem('gup-high', highScore.toString(32))
        highScoreText.innerHTML = (highScore/3).toString()

        lsButton.style.display = 'none'
        highScoreText.style.display = 'inline-block'
    }
})

function mouseHandler(e: MouseEvent) {
    mouseX = e.x
    mouseY = e.y
    enemy.rot = Math.atan2(mouseY-innerHeight/2, mouseX-innerWidth/2)
}

function touchHandler(e: TouchEvent) {
    mouseX = e.touches[0].clientX
    mouseY = e.touches[0].clientY
    enemy.rot = Math.atan2(mouseY-innerHeight/2, mouseX-innerWidth/2)
}

function distance(a: number, b: number) {
    return Math.sqrt(a**2 + b**2)
}

addEventListener('contextmenu', e => e.preventDefault())
}