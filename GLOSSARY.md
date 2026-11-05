# Shor Admin Panel

The tooling Shor's staff use to run the community around Shor, a Skyrim roleplay server.

## Language

### Places

**Shor**:
The Skyrim multiplayer (SkyMP) roleplay this project serves, played on its game servers.
_Avoid_: ShorRP (the GitHub organization's name), the game

**Game server**:
A SkyMP server that runs Shor. Shor has two: the main one and the test one.
_Avoid_: server (alone)

**Discord server**:
The Discord community space around Shor, where no roleplay is played.
_Avoid_: guild, the Discord, server (alone)

### People

**Account**:
A Discord account, whatever its standing on the Discord server: a member, a banned account, or one that is absent.
_Avoid_: user (alone), profile

**Member**:
A Discord account on the Discord server. A banned account is no longer one.
_Avoid_: user (alone), player

**Bot account**:
An account that Discord flags as a bot, whoever runs it: Shor's Discord application, which the Bot and the Admin Panel share, or the bot of a service. Shor's is one of them, not the only one.
_Avoid_: bot (alone, which names Shor's Bot), application account

**Staff**:
The members of Shor's team who moderate and administer the community.
_Avoid_: admins, mods (each names a level within the staff, not the staff as a whole)

**Staff role**:
A Discord role that makes a member of the Discord server part of the staff.
_Avoid_: admin role, mod role

### Tools

**Admin Panel**:
The web application where the staff administer the Discord server without code or bot commands, and where anyone with a Discord account takes the few steps that concern them, such as contesting a ban.
_Avoid_: dashboard, painel, staff panel (the interface's « Panel du staff », under Shor's name, is a label, not a name of it)

**Discord application**:
Shor's application in Discord's Developer Portal, whose token the Bot and the Admin Panel both use. On the Discord server it is a single bot account.
_Avoid_: panel's application, bot (alone), Shor Panel (its former name)

**Bot**:
The program that keeps Shor's Discord application connected to Discord, which reacts to what happens on the Discord server, serves its members there, such as their support tickets, and answers every interaction. Not the Admin Panel, which acts through the same Discord application only when a staff member uses it.
_Avoid_: ShorBot (the repository's name), client, panel bot

**Audit log**:
The Admin Panel's record of which staff member changed what, and when, beside the automatic sanctions. Not the panel's logs, which say only why the panel failed.
_Avoid_: logs, moderation log

**Game log**:
The record the game server posts in a channel of the Discord server of what happens on Shor, such as a staff member's administration command in game or a character's disconnection.
_Avoid_: logs, log-jeux (the channel's name)

**Bot log**:
The record the Bot posts in a channel of the Discord server of what it does on its own, with no staff member behind it, such as a role it gives or a temporary voice channel it creates. Not the audit log, which says what the staff changed.
_Avoid_: logs, admin log, log-admin (the channel's name)

**Privacy policy**:
The public statement of what Shor's Discord applications read, keep and write about people, why, for how long, who sees it, and how to ask for it to be corrected or deleted. Anyone can read it, with or without a Discord account.
_Avoid_: privacy notice, GDPR page, legal notice (French « mentions légales », which name the publisher, not the data)

### Moderation

**Whitelist**:
The approval that gives a player access to roleplay on Shor, granted by the staff after reviewing their application.
_Avoid_: allowlist

**Blocked word**:
A word or phrase the staff forbid in messages on the Discord server, which blocks the message and may carry an automatic sanction. Not the opposite of the whitelist.
_Avoid_: blacklist, banned word, forbidden word

**Panel's rules**:
The AutoMod rules on the Discord server whose keywords are the blocked words, one for each thing a blocked word can do, which the Admin Panel creates and keeps. Not the AutoMod rules the staff make in Discord, which the panel only shows.
_Avoid_: blocked words rule, the rule (alone)

**Sanction**:
A measure taken against an account for its conduct on the Discord server, by the staff or automatically: a warning, a timeout, a kick or a ban. Lifting a timeout or a ban is not a sanction.
_Avoid_: punishment, infraction, strike

**Automatic sanction**:
A timeout, a kick or a ban that falls with no staff member's action, when a member's message trips an AutoMod rule, such as a blocked word the staff tied to that sanction.
_Avoid_: auto-sanction, AutoMod sanction

**Warning**:
The one sanction that exists only in the Admin Panel: a formal notice from the staff to a member, with its reason. A warning the member contests successfully, or that the staff gave in error, is cancelled and stays on record, marked as such.
_Avoid_: strike

**Timeout**:
A sanction that keeps a member on the Discord server but stops them from writing, reacting or joining voice channels, until it ends or the staff lift it.
_Avoid_: mute (Discord's voice mute), exclusion (alone)

**Kick**:
A sanction that removes a member from the Discord server, which they may join again through an invite.
_Avoid_: exclusion (in French, Discord's word for a timeout)

**Ban**:
A sanction that removes an account from the Discord server and keeps it from joining again until the staff lift the ban. A ban has no end of its own.
_Avoid_: blacklist, temporary ban

**Record**:
Everything the staff can see about one account: its standing on the Discord server, its sanctions and the staff's notes, whether or not it is still a member.
_Avoid_: profile (Discord's own), member page

**Note**:
A remark the staff keep about an account, which the Admin Panel never shows to that account.
_Avoid_: comment

### Support

**Support ticket**:
A private channel on the Discord server where one member and the staff in charge of that kind of request handle it, from its opening to its closing with a reason.
_Avoid_: ticket (alone), which also names an issue of the tracker; support channel

**Tickets category**:
The category of the Discord server where the Bot creates the channel of each support ticket, « ・TICKETS PRIVÉS ・ » on Shor. A support ticket is in progress while its channel is in it.
_Avoid_: tickets folder

**Ticket archive**:
The record of a closed support ticket: who opened it, its request kind, when it opened and closed, who closed it and why, with no conversation. The Bot posts it in the archives channel before the support ticket is deleted.
_Avoid_: transcript (a copy of the conversation, which the Bot never reads), log

**Archives channel**:
A channel only the staff are meant to see, where the Bot posts each ticket archive.
_Avoid_: transcript channel, log channel
