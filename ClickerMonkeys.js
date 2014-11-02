// ==UserScript==
// @id          ClickerMonkeys
// @name        Clicker Monkeys
// @namespace   .
// @version     1.2
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
        var zoneTimer = 0;
        var currentZone = 0;
        var previousZone = 0;
        var stuckOnBoss = false;
        
        //GUI related. Do Not Change
        var autoBuyButton = document.createElement('input');
        var levelCidButton = document.createElement('input');
        var darkRitualButton = document.createElement('input');
        var autoAscendButton = document.createElement('input');
        
        //Set What you want as your max level
        var MLevel = 150;
        
        // Dogcog level, this will be detected automatically, no need to set it.
        var dogcog = 1;
        
        //IDs of the gilded heroes (Cid is 0)
        var guildedList = [6];
        
        //Basically how fast it levels up heroes. Set interval higher for slower repeats. Recommended minimum value 25
        var purchaseInterval = 100;
        
        //How often to check if you should ascend in miliseconds. Default is 30 seconds.
        var ascendInterval = 30000;
        
        //How long (in seconds) to wait for changezone before ascending. Example: If timeout is 60 seconds and it takes you longer than 60 seconds to defeat a zone you will ascend.
        var ascendTimeout = 60;
        
        //Will not ascend before you have reached this zone
        var minAscendZone = 100;
        
        //How often to try to buy all upgrades
        var upgradeInterval = 10000;
        
        //How often to poll for skills
        var skillInterval = 1000;
        
        //How often to check for retry boss timeout
        var bossTimeoutInterval = 10000;
        
        //After failing to kill a boss, how long to wait to retry (default is 30 minutes)
        var bossTimeout = 60000 * 30;
        
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
        var darkRitualEnabled = false;
        
        var App = {
            name: "Clicker Monkeys",
            onPlaying: function() {
                setInterval(purchaseHighest, purchaseInterval);
                setInterval(upgrades, upgradeInterval);
                setInterval(tryAscend, ascendInterval);
                setInterval(darkRitual, skillInterval);
                //setInterval(autoProgress,1000);
                
                try {
                    JSMod.setProgressMode(true);
                } catch (e) { /* Ignore exception. */ }
            },
            onSelectedZone: function(zone) {
                zoneTimer = Date.now();
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
        
        function skillsUnlocked(skillIDs){
            var save = JSON.parse(JSMod.getUserData());
            for (var i = 1; i <= skillIDs.length; i++) {
                if (save.skillCooldowns[skillIDs[i]] === undefined)
                    return false;
            }
            return true;
        }
        
        function getSkillCooldown(skillID){
            var save = JSON.parse(JSMod.getUserData());
            var vaagurMultiplier = 1;
            try {
                vaagurMultiplier = (100 - save.ancients.ancients[20].level * 5) / 100;
            } catch (e) { /* Ignore exception. */ }
            return [10, 10, 30, 30, 60, 480, 60, 60, 60][skillID - 1] * 1000 * 60 * vaagurMultiplier;
        }
        
        function skillsReady(skillIDs){
            //debug('Running skillsReady for ' + skillIDs);
            var cooldowns = JSON.parse(JSMod.getUserData()).skillCooldowns;
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
                var cooldowns = JSON.parse(JSMod.getUserData()).skillCooldowns;
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
                    //debug("Time till next use " + (getSkillCooldown(9) - (Date.now() - JSON.parse(JSMod.getUserData()).skillCooldowns[9])));
                }
            }
        }
        
        //WIP - totally broken right now - Will needs to fix
        function autoProgress(){
            var save = JSON.parse(JSMod.getUserData());
            var zone = save.currentZoneHeight;
            
            if (currentZone != zone) {
                if (previousZone > zone) {
                    if (zoneTimer === 0)
                        zoneTimer = Date.now();
                }
                previousZone = zone;
            } else{
                
            }
        }
        
        //Commented because it sucks (need DPS) << official 
        // function autoProgress() {
        //     var save = JSON.parse(JSMod.getUserData());
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
        
        function upgrades() {
            try {
                JSMod.buyAllAvailableUpgrades();
            } catch (e) { /* Ignore error, button probably not unlocked yet. */ }
        }
        
        function reportSkillCooldowns() {
            for (var i = 1; i <= 9; i++)
                debug('Skill cooldown for skill ' + i + ' is ' + JSON.parse(JSMod.getUserData()).skillCooldowns[i] + ' miliseconds');
        }
        
        function tryAscend() {
            var timeout = (Date.now() - zoneTimer) / 1000;
            //debug("Trying to ascend. Timeout is " + timeout);
            if (currentZone >= minAscendZone && (timeout > ascendTimeout)) {
                JSMod.ascend();
                try {
                    JSMod.setProgressMode(true);
                } catch (e) { /* Ignore exception. */ }
            }
        }
        
        function calculateHeroCost(id) {
            var level = JSON.parse(JSMod.getUserData()).heroCollection.heroes[id + 1].level;
            return calculateHeroCost(id, level);
        }
        
        function calculateHeroCost(id, level) {
            if (id === 0 && level <= 15 && levelCidEnabled)
                return Math.floor((5 + level) * Math.pow(1.07, level) * dogcog);
            else if (id === 0 && levelCidEnabled)
                return Math.floor(20 * Math.pow(1.07, level) * dogcog);
            else
                return Math.floor(baseCosts[id] * Math.pow(1.07, level) * dogcog);
        }
        
        function canPurchaseHero(id) {
            return canPurchaseHero(id, (JSON.parse(JSMod.getUserData())).gold);
        }
        
        function canPurchaseHero(id, gold) {
            return (gold > calculateHeroCost(id)) && (JSON.parse(JSMod.getUserData()).heroCollection.heroes[id + 1].level < MLevel || isGuilded(id));
        }
        
        function isGuilded(heroID) {
            for (var i = 0; i < guildedList.length; i++) {
                if (guildedList[i] == heroID)
                    return true;
            }
            return false;
        }
        
        // function isGuilded(heroID) {
        //     var result = null; 
        //     try {
        //         result = (JSON.parse(JSMod.getUserData()).heroCollection.heroes[heroID].epicLevel > 0);
        //     } catch (e) {
        //         debug("Something went wrong! " + e.message);
        //     }
        //     return result;
        // }
        
        function purchaseCheapest() {
            updateDogcog();
            var save = JSON.parse(JSMod.getUserData());
            var heroCosts = [];
            var bossTimer = 30 + (save.ancients.ancients[17].level * 5);
            for (var i = 0; i < 26; i++)
                heroCosts[i] = ((save.heroCollection.heroes[i + 1].level < MLevel || isGuilded(i)) ? calculateHeroCost(i, save.heroCollection.heroes[i + 1].level) : Number.MAX_VALUE);

            if (save.gold > Math.min.apply(Math, heroCosts))
                JSMod.levelHero(heroCosts.indexOf(Math.min.apply(Math, heroCosts)) + 1);
        }
        
        function getMaxLevel(heroID) {
            return (isGuilded(heroID) ? Number.MAX_VALUE : maxLevels[heroID]);
        }
        
        function maxLevelHero(heroLevel, heroID) {
            JSMod.setShiftEnabled(false);
            JSMod.setCtrlEnabled(false);
            JSMod.setZKeyEnabled(false);
            var heroDif = getMaxLevel(heroID) - heroLevel;
            
            if (heroDif >= 100)
                JSMod.setCtrlEnabled(true);
            else if (heroDif >= 25)
                JSMod.setZKeyEnabled(true);
            else if (heroDif >= 10)
                JSMod.setZKeyEnabled(true);
            JSMod.levelHero(heroID + 1);
            JSMod.setShiftEnabled(false);
            JSMod.setCtrlEnabled(false);
            JSMod.setZKeyEnabled(false);
        }
        
        function purchaseHighest() {
            if (autoBuy) {
                updateDogcog();
                var save = JSON.parse(JSMod.getUserData());
                var currentGold = save.gold;
                var heroCost;
                for (var i = 25; i >= 0; i--) {
                    if (save.heroCollection.heroes[i + 1].level < maxLevels[i] || isGuilded(i)) {
                        heroCost = calculateHeroCost(i, save.heroCollection.heroes[i + 1].level);
                        if (currentGold > heroCost)
                            return maxLevelHero(save.heroCollection.heroes[i + 1].level, i);
                    }
                }
            }
        }
        
        function updateDogcog() {
            var save = JSON.parse(JSMod.getUserData());
            try {
                var temp = dogcog;
                dogcog = (save.ancients.ancients[11].level * 0.02);
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
