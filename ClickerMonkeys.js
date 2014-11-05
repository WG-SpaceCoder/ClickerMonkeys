// ==UserScript==
// @id          ClickerMonkeys
// @name        Clicker Monkeys
// @namespace   .
// @version     1.3.1064
// @authors     Zininzinin, unv_annihilator
// @description Trying to automate ALL THE THINGS with clicker heroes
// @include     http://www.clickerheroes.com/
// @grant       none
// @require     http://code.jquery.com/jquery-2.1.1.min.js
// ==/UserScript==

(function() {
    "use strict";
    
    var main = function() {
        "use strict";
        
        var JSMod = null;
        var loadAttempts = 0;
        var maxAttempts = 100;
        var loadTimeout = 10000;
        
        //Do Not Change
        var baseCosts = [10, 50, 250, 1000, 4000, 20000, 100000, 400000, 2500000, 15000000, 100000000, 800000000, 6500000000, 50000000000, 450000000000, 4000000000000, 36000000000000, 320000000000000, 2700000000000000, 24000000000000000, 300000000000000000, 9000000000000000000, 350000000000000000000, 1.4e+22, 4.19999999999999e+24, 2.1e+27];
        var maxLevels = [150, 100, 125, 75, 100, 100, 75, 75, 75, 100, 75, 100, 100, 100, 100, 125, 125, 75, 75, 150, 100, 100, 125, 100, 75, 75];
        var baseDamage = [0, 5, 22, 74, 245, 976, 3725, 10859, 47143, 186000, 782000, 3721000, 17010000, 69480000, 460e6, 3017e6, 20009e6, 131e9, 814e9, 5335e9, 49143e9, 1086e12, 31124e12, 917e15, 202e18, 74698e18];
        var zoneTimer = 0;
        var bossTimer = 0;
        var currentZone = 0;
        var previousZone = 0;
        var dogcog = 1;
        
        //GUI related. Do Not Change
        var autoBuyButton = document.createElement('input');
        var levelCidButton = document.createElement('input');
        var darkRitualButton = document.createElement('input');
        var autoAscendButton = document.createElement('input');
        
        //List of skills to use. 1 = clickstorm recommended for autoclickers = [1, 2, 3, 4, 5, 7];
        var skillsToSpam = [1, 2, 3, 4, 5, 7];
        
        //IDs of the gilded heroes (Cid is 0)
        var guildedList = [25];
        
        //Basically how fast it levels up heroes. Set interval higher for slower repeats. Recommended minimum value 25
        var purchaseInterval = 500;
        
        //How often to check if you should ascend in miliseconds. Default is 30 seconds.
        var ascendInterval = 30000;
        
        //How long (in seconds) to wait for changezone before ascending. Example: If timeout is 60 seconds and it takes you longer than 60 seconds to defeat a zone you will ascend.
        var ascendTimeout = 60;
        
        //Will not ascend before you have reached this zone
        var minAscendZone = 150;
        
        //How often to try to buy all upgrades
        var upgradeInterval = 10000;
        
        //How often to poll for skills
        var skillInterval = 1000;
        
        //How often to check for retry boss timeout
        var bossTimeoutInterval = 10000;
        
        //After failing to kill a boss, how long to wait to retry (default is 20 minutes) 60000 * 20
        var bossTimeout = 60000 * 20;
        
        //autobuy heroes by default
        var autoBuy = true;
        
        //auto-ascend by default
        var autoAscend = true;
        
        //Auto-level Cid by default
        var levelCidEnabled = true;
        
        //Enables debug messaging. Messages can be viewed in browser console.
        var enableDebug = true;
        
        //Remove Clicker Heroes logo from top of page. Used for lower resolution screens
        var disableLogo = true;
        
        //If dark ritual is enabled on start
        var darkRitualEnabled = true;
        
        var App = {
            name: "Clicker Monkeys",
            onPlaying: function() {
                //setInterval(purchaseHighest, purchaseInterval);
                setInterval(getMostEfficientHero, purchaseInterval);
                setInterval(upgrades, upgradeInterval);
                setInterval(tryAscend, ascendInterval);
                setInterval(darkRitual, skillInterval);
                setInterval(spamSkills,skillInterval);
                setInterval(autoProgress,bossTimeoutInterval);
                
                try {
                    JSMod.setProgressMode(true);
                } catch (e) { /* Ignore exception. */ }
            },
            onSelectedZone: function(zone) {
                zoneTimer = Date.now();
                previousZone = currentZone;
                currentZone = zone;
                //debug("New zone: " + zone + " at time " + zoneTimer);
                autoProgress();
            },
            onReady: function() {
                debug("Ready to roll fox!");
                initButtons();
                baseCosts[0] = ((!levelCidEnabled) ? Number.MAX_VALUE : 10);
            }
        };
        
        function debug(message) {
            if (enableDebug)
                console.log(message);
        }
        
        function spamSkills(){
            for (var i = 0; i < skillsToSpam.length; i++) {
                //debug('Trying to spam skill ' + skillsToSpam[i]);
                if (skillsReady([skillsToSpam[i]]))
                    JSMod.useSkill(skillsToSpam[i]);
            }
        }
        
        function getAncientLevel(id){
            try {
                return getUserData().ancients.ancients[id].level;
            } catch (e) {
                return 0;
            }
        }
        
        function skillsUnlocked(skillIDs){
            var save = getUserData();
            for (var i = 1; i <= skillIDs.length; i++) {
                if (save.skillCooldowns[skillIDs[i]] === undefined)
                    return false;
            }
            return true;
        }
        
        function getSkillCooldown(skillID){
            var vaagurMultiplier = 1;
            try {
                vaagurMultiplier = (100 - getAncientLevel(20) * 5) / 100;
            } catch (e) { /* Ignore exception. */ }
            return [10, 10, 30, 30, 60, 480, 60, 60, 60][skillID - 1] * 1000 * 60 * vaagurMultiplier;
        }
        
        function skillsReady(skillIDs){
            //debug('Running skillsReady for ' + skillIDs);
            var cooldowns = getUserData().skillCooldowns;
            for (var i = 0; i < skillIDs.length; i++) {
                //debug('Time since used skill ' + skillIDs[i] + ' is ' + (Date.now() - cooldowns[skillIDs[i]]) + ' and timeout is ' + getSkillCooldown(skillIDs[i]));
                if (cooldowns[skillIDs[i]] === undefined || (Date.now() - cooldowns[skillIDs[i]] < getSkillCooldown(skillIDs[i]) && cooldowns[skillIDs[i]] !== 0))
                    return false;
                //debug('cooldowns[skillIDs[i]] ' + cooldowns[skillIDs[i]] + ' for skill ID ' + skillIDs[i]);
            }
            return true;
        }
        
        function darkRitual(){
            //debug("Running Dark Ritual and it is " + darkRitualEnabled);
            if (darkRitualEnabled) {
                if (skillsReady([6, 8, 9])) {
                    //debug("First EDR");
                    JSMod.useSkill(8);
                    JSMod.useSkill(6);
                    JSMod.useSkill(9);
                } else if (skillsReady([8, 9])) {
                    //debug("Second EDR");
                    JSMod.useSkill(8);
                    JSMod.useSkill(9);
                } else {
                    //debug("Time till next use " + (getSkillCooldown(9) - (Date.now() - getUserData().skillCooldowns[9])));
                }
            }
        }
        
        function autoProgress(){
            if (previousZone > currentZone) {
                if (bossTimer === 0) {
                    debug('Failed to kill boss. Starting timer');
                    bossTimer = Date.now();
                } else {
                    if ((Date.now() - bossTimer) > bossTimeout) {
                        debug("Trying to kill boss again");
                        JSMod.setProgressMode(true);
                        bossTimer = 0;
                        previousZone = currentZone;
                    }
                }
            }
        }
        
        //Commented because it sucks (need DPS in order for this version to work) << official 
        // function autoProgress() {
        //     var save = getUserData();
        //     var zone = save.currentZoneHeight;
        //     var bossHP;
        //     //If you are the zone before a boss
        //     if ((zone % 5) == 4) {
        //         var bossZone = zone + 1;
        //         if (zone < 140)
        //             bossHP = 10 * (Math.pow(1.6, (bossZone - 1)) + (bossZone - 1)) * 10;
        //         else
        //             bossHP = 10 * ((Math.pow(1.6, 139) + 139) * Math.pow(1.15, (bossZone - 140))) * 10;
        //         debug("Level " + bossZone + " Boss with HP " + bossHP);
        //     }
        //      //This will be needed at some point: var bossTimer = 30 + (getAncientLevel(17) * 5);
        // }
        
        function initButtons() {
            if (disableLogo)
                document.getElementById("logo").style.display = 'none';
            autoBuyButton.type = 'button';
            autoBuyButton.value = 'Auto-Buy ' + autoBuy;
            autoBuyButton.onclick = setAutoBuy;
            $('#header').append(autoBuyButton);
            
            levelCidButton.type = 'button';
            levelCidButton.value = 'Level Cid ' + levelCidEnabled;
            levelCidButton.onclick = setLevelCid;
            $('#header').append(levelCidButton);
            
            darkRitualButton.type = 'button';
            darkRitualButton.value = 'Dark Ritual ' + darkRitualEnabled;
            darkRitualButton.onclick = setDarkRitual;
            $('#header').append(darkRitualButton);
            
            autoAscendButton.type = 'button';
            autoAscendButton.value = ((autoAscend) ? 'Auto Ascenion' : 'Deep Run');
            autoAscendButton.onclick = setAutoAscend;
            $('#header').append(autoAscendButton);
        }
        
        function setAutoAscend(){
            debug('setAutoAscend Clicked!');
            autoAscend = !autoAscend;
            autoAscendButton.value = (autoAscend ? 'Auto Ascenion' : 'Deep Run');
        }
        
        function setDarkRitual(){
            debug('setDarkRitual Clicked!');
            darkRitualEnabled = !darkRitualEnabled;
            darkRitualButton.value = 'Dark Ritual ' + darkRitualEnabled;
        }
        
        function setAutoBuy() {
            debug('autoBuyButton Clicked!');
            autoBuy = !autoBuy;
            autoBuyButton.value = 'Auto-Buy ' + autoBuy;
        }
        
        function setLevelCid() {
            debug('setLevelCid Clicked!');
            levelCidEnabled = !levelCidEnabled;
            levelCidButton.value = 'Level Cid ' + levelCidEnabled;
            baseCosts[0] = ((!levelCidEnabled) ? Number.MAX_VALUE : 10);
        }
        
        function getUserData(){
            var gotData = true;
            var save;
            while (gotData){
                try {
                    save = JSON.parse(JSMod.getUserData());
                    gotData = false;
                } catch (e) {
                    debug('Failed to get userData');
                    gotData = true;
                }
            }
            return save;
        }
        
        function upgrades() {
            try {
                JSMod.buyAllAvailableUpgrades();
            } catch (e) { /* Ignore error, button probably not unlocked yet. */ }
        }
        
        function reportSkillCooldowns() {
            for (var i = 1; i <= 9; i++)
                debug('Skill cooldown for skill ' + i + ' is ' + getUserData().skillCooldowns[i] + ' miliseconds');
        }
        
        function tryAscend() {
            if (autoAscend){
                var timeout = (Date.now() - zoneTimer) / 1000;
                //debug("Trying to ascend. Timeout is " + timeout);
                if (currentZone >= minAscendZone && (timeout > ascendTimeout)) {
                    JSMod.ascend();
                    try {
                        JSMod.setProgressMode(true);
                    } catch (e) { /* Ignore exception. */ }
                }
            }
        }
        
        function calculateHeroCost(id) {
            var level = getUserData().heroCollection.heroes[id + 1].level;
            return calculateHeroCost(id, level);
        }
        
        function calculateHeroCost(id, level) {
            //debug('dogcog is ' + dogcog);
            //debug('calculateHeroCost level ' + level + ' id ' + id);
            if (!levelCidEnabled && id === 0)
                return Number.MAX_VALUE;
            else if (id === 0 && level <= 15)
                return Math.floor((5 + level) * Math.pow(1.07, level) * dogcog);
            else if (id === 0)
                return Math.floor(20 * Math.pow(1.07, level) * dogcog);
            else
                return Math.floor(baseCosts[id] * Math.pow(1.07, level) * dogcog);
        }
        
        function canPurchaseHero(id) {
            var save = getUserData();
            var level = save.heroCollection.heroes[id + 1].level;
            //debug('gold ' + save.gold + ' hero cost ' + calculateHeroCost(id) + ' level ' + save.heroCollection.heroes[id + 1].level + ' max ' + MLevel + ' gilded ' + isGuilded(id));
            return (save.gold > calculateHeroCost(id, level) && (level < getMaxLevel(id) || isGuilded(id)));
        }
        
        function isGuilded(heroID) {
            if (guildedList.length === 0)
                return true;
            for (var i = 0; i < guildedList.length; i++) {
                if (guildedList[i] == heroID)
                    return true;
            }
            return false;
        }
        
        // function isGuilded(heroID) {
        //     var result = null; 
        //     try {
        //         result = (getUserData().heroCollection.heroes[heroID].epicLevel > 0);
        //     } catch (e) {
        //         debug("Something went wrong! " + e.message);
        //     }
        //     return result;
        // }
        
        function purchaseCheapest() {
            updateDogcog();
            var save = getUserData();
            var heroCosts = [];
            for (var i = 0; i < 26; i++)
                heroCosts[i] = ((save.heroCollection.heroes[i + 1].level < getMaxLevel(i) || isGuilded(i)) ? calculateHeroCost(i, save.heroCollection.heroes[i + 1].level) : Number.MAX_VALUE);

            if (save.gold > Math.min.apply(Math, heroCosts))
                JSMod.levelHero(heroCosts.indexOf(Math.min.apply(Math, heroCosts)) + 1);
        }
        
        function getMaxLevel(heroID) {
            return (isGuilded(heroID) ? Number.MAX_VALUE : maxLevels[heroID]);
        }
        
        function maxLevelHero(heroID) {
            JSMod.setShiftEnabled(false);
            JSMod.setCtrlEnabled(false);
            JSMod.setZKeyEnabled(false);
            var heroLevel = getUserData().heroCollection.heroes[heroID+1].level;
            var heroDif = getMaxLevel(heroID) - heroLevel;
            
            if (heroDif >= 100)
                JSMod.setCtrlEnabled(true);
            else if (heroDif >= 25)
                JSMod.setZKeyEnabled(true);
            else if (heroDif >= 10)
                JSMod.setZKeyEnabled(true);
            //debug('Leveling Hero ' + heroID);
            JSMod.levelHero(heroID + 1);
            JSMod.setShiftEnabled(false);
            JSMod.setCtrlEnabled(false);
            JSMod.setZKeyEnabled(false);
        }
        
        function purchaseHighest() {
            if (autoBuy) {
                updateDogcog();
                for (var i = 25; i >= 0; i--) {
                    if (canPurchaseHero(i)){
                        maxLevelHero(i);
                        break;
                    }
                }
            }
        }
        
        function calculateHeroDps(save, hero, level){
            if (level === 0)
                return 0;
            return baseDamage[hero.id-1] * hero.damageMultiplier * save.allDpsMultiplier * (1 + (0.5 + 0.02 * getAncientLevel(28)) * hero.epicLevel) * level * Math.pow(4, Math.min(Math.max(Math.floor((level - 175) / 25), 0) - Math.min(Math.floor(level / 1000), 3), 154)) * Math.pow(10, Math.min(Math.floor(level / 1000), 3)) * (1 + 0.1 * save.heroSouls) + (baseDamage[hero.id-1] * level * hero.damageMultiplier * save.allDpsMultiplier * (1 + (0.5 + 0.2 * getAncientLevel(28)) * hero.epicLevel) *(1 + 0.11 * getAncientLevel(16)));
        }
        
        function calculateEasyHeroDps(save, hero, level){
            if (level === 0)
                return 0;
            return baseDamage[hero.id-1] * hero.damageMultiplier * save.allDpsMultiplier * (1 + (0.5 + 0.02 * getAncientLevel(28)) * hero.epicLevel) * level * Math.pow(4, Math.min(Math.max(Math.floor((level - 175) / 25), 0) - Math.min(Math.floor(level / 1000), 3), 154)) * Math.pow(10, Math.min(Math.floor(level / 1000), 3)) * (1 + 0.1 * save.heroSouls);
        }
        
        function heroesBelowMin(){
            var heroesBelow = [];
            var save = getUserData();
            for (var i = 0; i < 26; i++){
                //debug(save.heroCollection.heroes[i+1]);
                if (save.heroCollection.heroes[i+1].level < maxLevels[i])
                    heroesBelow.push(i);
            }
            return heroesBelow;
        }
        
        function getHeroEfficiency(save, hero){
            //debug('Hero ' + hero);
            if (hero.id === 0)
                return 0;
            else{
                return (calculateEasyHeroDps(save, hero, hero.level + 1) - calculateEasyHeroDps(save, hero, hero.level)) / calculateHeroCost(hero.id - 1, hero.level + 1);
            }
        }
        
        function getMostEfficientHero(){
            if (autoBuy){
                var save = getUserData();
                var bestHero = [0, 0];
                var tempHero;
                var heroesBelow = [];
                
                for (var i = 0; i < 26; i++){
                    //debug(save.heroCollection.heroes[i+1]);
                    if (save.heroCollection.heroes[i+1].level < maxLevels[i] && !save.heroCollection.heroes[i+1].locked)
                        heroesBelow.push(i);
                }
                if (heroesBelow.length > 0){
                    for (var i = 0; i < heroesBelow.length; i++){
                        tempHero = [i, getHeroEfficiency(save, save.heroCollection.heroes[i+1])];
                        //debug('Hero ' + i + ' Efficiency: ' + getHeroEfficiency(save, save.heroCollection.heroes[i+1]));
                        if (tempHero[1] > bestHero[1])
                            bestHero = tempHero;
                    }
                } else{
                
                    for (var i = 0; i < 26; i++) {
                        if (!save.heroCollection.heroes[i+1].locked){
                            tempHero = [i, getHeroEfficiency(save, save.heroCollection.heroes[i+1])];
                            //debug('Hero ' + i + ' Efficiency: ' + getHeroEfficiency(save, save.heroCollection.heroes[i+1]));
                            if (tempHero[1] > bestHero[1])
                                bestHero = tempHero;
                        }
                    }
                }
                //debug ('Best hero is ' + bestHero[0]);
                JSMod.levelHero(bestHero[0] + 1);
            }
        }
        
        function updateDogcog() {
            try {
                var temp = dogcog;
                dogcog = (getAncientLevel(11) * 0.02);
                if (dogcog === 0)
                    dogcog = 1;
                if (temp != dogcog)
                    debug("Set dogcog from " + temp + ", to " + dogcog);
            } catch (e) { /* Ignore exception, more than likely not unlocked. */ }
        }
        
        function init() {
            if (window.JSMod === undefined) {
                if (loadAttempts++ < maxAttempts)
                    window.setTimeout(init, loadTimeout / maxAttempts);
                else
                    alert("Failed to load " + App.name + "! Cannot find JSMod object on global scope");
            } else {
                JSMod = window.JSMod;
                JSMod.loadApp(App);
            }
        }
        
        init();
    };
    
    function inject(func) {
        var script = document.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.appendChild(document.createTextNode("(" + func + ")();"));
        $("head").append(script)[0].removeChild(script);
    }
    
    $(inject(main));
})();
