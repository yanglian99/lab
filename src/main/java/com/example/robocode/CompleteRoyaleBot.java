package com.example.robocode;

import dev.robocode.tankroyale.botapi.Bot;
import dev.robocode.tankroyale.botapi.BotInfo;
import dev.robocode.tankroyale.botapi.Color;
import dev.robocode.tankroyale.botapi.events.DeathEvent;
import dev.robocode.tankroyale.botapi.events.HitBotEvent;
import dev.robocode.tankroyale.botapi.events.HitByBulletEvent;
import dev.robocode.tankroyale.botapi.events.HitWallEvent;
import dev.robocode.tankroyale.botapi.events.RoundStartedEvent;
import dev.robocode.tankroyale.botapi.events.ScannedBotEvent;

import static java.lang.Math.abs;
import static java.lang.Math.atan2;
import static java.lang.Math.cos;
import static java.lang.Math.min;
import static java.lang.Math.signum;
import static java.lang.Math.sin;
import static java.lang.Math.toDegrees;
import static java.lang.Math.toRadians;

/**
 * A complete Robocode Tank Royale bot that demonstrates structured movement,
 * targeting, radar control, and event-based reactions.
 */
public class CompleteRoyaleBot extends Bot {

    private static final double FULL_SCAN = 360.0;
    private static final double WALL_MARGIN = 80.0;
    private static final double BASE_MOVE_DISTANCE = 140.0;
    private static final double MAX_FIRE_POWER = 3.0;

    private int moveDirection = 1;
    private double radarDirection = 1.0;
    private int randomSeed = 17;

    private int targetId = -1;
    private double enemyX;
    private double enemyY;
    private double enemySpeed;
    private double enemyHeading;
    private double enemyDistance = Double.POSITIVE_INFINITY;
    private double enemyEnergy = 100.0;
    private boolean enemyVisible;

    public static void main(String[] args) {
        // start() is the API entry point that connects this standalone bot to the game server.
        new CompleteRoyaleBot().start();
    }

    public CompleteRoyaleBot() {
        // BotInfo.fromFile() loads the JSON bot metadata required by Tank Royale.
        super(BotInfo.fromFile("CompleteRoyaleBot.json"));
    }

    @Override
    public void run() {
        configureAppearance();
        // Keep the gun/radar independent from body turns so movement does not break aim or radar lock.
        setAdjustGunForBodyTurn(true);
        setAdjustRadarForGunTurn(true);
        setAdjustRadarForBodyTurn(true);

        while (isRunning()) {
            performRadarSweep();
            performMovement();

            if (enemyVisible) {
                aimAtTrackedTarget();
                if (abs(calcGunBearing(calculateAbsoluteBearing(enemyX, enemyY))) < 6) {
                    fire(selectFirePower(enemyDistance));
                }
            } else {
                // turnGunRight() uses the gun motor independently so the bot keeps searching while moving.
                turnGunRight(45);
            }
        }
    }

    @Override
    public void onScannedBot(ScannedBotEvent event) {
        double previousEnergy = enemyEnergy;
        updateTrackedEnemy(event);
        lockRadar(event);
        aimAtTrackedTarget();

        double firePower = selectFirePower(enemyDistance);
        if (abs(calcGunBearing(calculateAbsoluteBearing(enemyX, enemyY))) < 4) {
            // fire(power) spends energy to launch a bullet; higher power hits harder but costs more.
            fire(firePower);
        }

        if (event.getEnergy() < previousEnergy) {
            reverseDirection();
        }
    }

    @Override
    public void onHitByBullet(HitByBulletEvent event) {
        // calcBearing(direction) converts an absolute bullet direction into a relative turn for this bot.
        double bulletBearing = calcBearing(event.getBullet().getDirection());
        turnRight(normalizeRelativeAngle(90 - bulletBearing));
        reverseDirection();
        moveWithDirection(BASE_MOVE_DISTANCE * 0.8);
    }

    @Override
    public void onHitWall(HitWallEvent event) {
        // calcBearing(directionTo(...)) converts the wall contact into an escape turn away from the wall.
        double wallBearing = calcBearing(directionTo(getArenaWidth() / 2, getArenaHeight() / 2));
        turnRight(normalizeRelativeAngle(wallBearing));
        reverseDirection();
        moveWithDirection(BASE_MOVE_DISTANCE);
    }

    @Override
    public void onHitBot(HitBotEvent event) {
        targetId = event.getVictimId();
        enemyVisible = true;
        enemyX = event.getX();
        enemyY = event.getY();
        enemyDistance = distanceTo(enemyX, enemyY);
        enemyEnergy = event.getEnergy();
        aimAtTrackedTarget();
        fire(2.5);
        reverseDirection();
        moveWithDirection(BASE_MOVE_DISTANCE * 0.6);
    }

    @Override
    public void onRoundStarted(RoundStartedEvent event) {
        targetId = -1;
        enemyVisible = false;
        enemyDistance = Double.POSITIVE_INFINITY;
        enemyEnergy = 100.0;
        moveDirection = 1;
        radarDirection = 1.0;
        // setTurnRadarRight() queues radar rotation immediately at the start of each round.
        setTurnRadarRight(FULL_SCAN);
    }

    @Override
    public void onDeath(DeathEvent event) {
        enemyVisible = false;
        targetId = -1;
        System.out.println("CompleteRoyaleBot destroyed on round " + getRoundNumber());
    }

    private void configureAppearance() {
        // setBodyColor()/setGunColor()/setRadarColor() customize the bot visuals shown in the arena.
        setBodyColor(Color.fromHex("#2E86DE"));
        setGunColor(Color.fromHex("#1B4F72"));
        setRadarColor(Color.fromHex("#F1C40F"));
        setTurretColor(Color.fromHex("#154360"));
        setScanColor(Color.fromHex("#58D68D"));
        setBulletColor(Color.fromHex("#EC7063"));
        setTracksColor(Color.fromHex("#D6EAF8"));
    }

    private void performMovement() {
        if (isNearWall()) {
            reverseDirection();
            turnRight(60 * moveDirection);
        } else if (enemyVisible) {
            strafeAroundEnemy();
        } else {
            wander();
        }
    }

    private void wander() {
        double randomTurn = (nextRandom() % 50) - 25;
        if (nextRandom() % 6 == 0) {
            reverseDirection();
        }
        if (randomTurn >= 0) {
            // turnRight(degrees) rotates the chassis clockwise before the next movement step.
            turnRight(randomTurn);
        } else {
            // turnLeft(degrees) rotates the chassis counter-clockwise when that is shorter.
            turnLeft(-randomTurn);
        }
        moveWithDirection(BASE_MOVE_DISTANCE * (0.8 + (nextRandom() % 5) * 0.1));
    }

    private void strafeAroundEnemy() {
        double targetBearing = calculateAbsoluteBearing(enemyX, enemyY);
        double perpendicularTurn = normalizeRelativeAngle(targetBearing + (90 * moveDirection) - getDirection());

        if (nextRandom() % 8 == 0) {
            reverseDirection();
        }

        if (perpendicularTurn >= 0) {
            turnRight(perpendicularTurn);
        } else {
            turnLeft(-perpendicularTurn);
        }

        moveWithDirection(clamp(enemyDistance * 0.45, 80, 180));
    }

    private void moveWithDirection(double distance) {
        if (moveDirection > 0) {
            // forward(distance) is a blocking API call that drives the bot ahead by the given distance.
            forward(distance);
        } else {
            // back(distance) is the matching blocking API call for moving backwards.
            back(distance);
        }
    }

    private void reverseDirection() {
        moveDirection *= -1;
    }

    private void performRadarSweep() {
        if (!enemyVisible) {
            // turnRadarRight(degrees) spins the radar independently for continuous arena scanning.
            turnRadarRight(FULL_SCAN * radarDirection);
            radarDirection *= -1;
        }
    }

    private void lockRadar(ScannedBotEvent event) {
        double radarBearing = calcRadarBearing(directionTo(event.getX(), event.getY()));
        double extraTurn = 20 * signum(radarBearing == 0 ? radarDirection : radarBearing);
        turnRadarRight(radarBearing + extraTurn);
    }

    private void aimAtTrackedTarget() {
        double bulletPower = selectFirePower(enemyDistance);
        double bulletSpeed = calcBulletSpeed(bulletPower);
        double timeToTarget = enemyDistance / bulletSpeed;

        double predictedX = enemyX + sin(toRadians(enemyHeading)) * enemySpeed * timeToTarget;
        double predictedY = enemyY + cos(toRadians(enemyHeading)) * enemySpeed * timeToTarget;

        predictedX = clamp(predictedX, WALL_MARGIN, getArenaWidth() - WALL_MARGIN);
        predictedY = clamp(predictedY, WALL_MARGIN, getArenaHeight() - WALL_MARGIN);

        double gunTurn = calcGunBearing(calculateAbsoluteBearing(predictedX, predictedY));
        if (gunTurn >= 0) {
            // turnGunRight(degrees) rotates only the gun, allowing independent aiming from movement.
            turnGunRight(gunTurn);
        } else {
            // turnGunLeft(degrees) rotates the gun counter-clockwise when shorter than turning right.
            turnGunLeft(-gunTurn);
        }
    }

    private void updateTrackedEnemy(ScannedBotEvent event) {
        targetId = event.getScannedBotId();
        enemyVisible = true;
        enemyX = event.getX();
        enemyY = event.getY();
        enemyDistance = distanceTo(enemyX, enemyY);
        enemyHeading = event.getDirection();
        enemySpeed = event.getSpeed();
        enemyEnergy = event.getEnergy();
    }

    private double selectFirePower(double distance) {
        if (!enemyVisible) {
            return 1.0;
        }
        if (distance < 140) {
            return min(MAX_FIRE_POWER, getEnergy() / 8 + 1.2);
        }
        if (distance < 320) {
            return min(2.2, getEnergy() / 10 + 0.8);
        }
        return 1.0;
    }

    private boolean isNearWall() {
        return getX() < WALL_MARGIN
                || getY() < WALL_MARGIN
                || getX() > getArenaWidth() - WALL_MARGIN
                || getY() > getArenaHeight() - WALL_MARGIN;
    }

    private double calculateAbsoluteBearing(double x, double y) {
        double dx = x - getX();
        double dy = y - getY();
        double absoluteBearing = toDegrees(atan2(dx, dy));
        return normalizeAbsoluteAngle(absoluteBearing);
    }

    private double clamp(double value, double minValue, double maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    }

    private int nextRandom() {
        randomSeed = (randomSeed * 1103515245 + 12345) & 0x7fffffff;
        return randomSeed;
    }
}
