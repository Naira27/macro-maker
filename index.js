const path = require('path');
const fs = require('fs');

const settings= "settings";

const sorcerer = "sorc";
const archer = "arch";
const gunner = "gun";

const priest = "priest";
const mystic = "myst";

const lancer = "lanc";
const brawler = "brawl";
const warrior = "war";
const berserker = "zerk";

const ninja = "ninja";
const reaper = "reaper";
const valk = "valk";
const slayer = "slayer";

const { Readable, Writeable } = require('tera-data-parser/lib/protocol/stream');
const ONLY_USER_HOOK = {order: -1000000, filter: {fake: false}};

module.exports = function Macro(dispatch) {
	//From old module
	let blockDelay = 10;
	let setDelay = 130;
	
	//info for funnctions
	let gameId=dispatch.game.me.gameId;
	let model; //used to get player class //can be undefined after Hot-Reload
	let attackSpeed; //attack speed
	let loc = { };
	let xloc; //destination
	let yloc; //destination
	let zloc; //destination
	let w = 0;
	let abnormalityid; //buff/effect
	let target; //Boss id
	
	//For Macro
	let bto = 200; //Bait>Skill timeout
	let timeout = 500;
	let startTime;
	let elapsedTime;
	let skillCastTime; //not used now
	let skillCooldown; //not used now
	let skillInteruptTime;  //not used now //time when you can interrupt skill(from skill start time)
	let canInterupt;  //not used now //can interupt skill with dodge skills?
	let nocooldown = false; //no cooldown
	
	// Config array indexes
	const ROT_OFFSET = 2; //Macro array index Offset
	let cSkillNum = 0; //Current Skill Number
	let cRotNum = 0; //Current Macro Mumber
	let cSkillName = "NoName";
	let cSkillId; //skill id
	let dontDoIt; //for commands
	let j; //Used variable
	let tempName; //Used variable
	let tempStr="";//Used variable
	let isCatch=false; //used to catch id and type of skills
	let catId;
	let catType;
	
	//Arrays
	let time = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; //20 time for debug
	let timeid=0;
	
	//Core
	let bait = true; // Default - Auro enabled // Not used..
	
	
	//Config
	let config = {};
	try 
	{
		config = require('./config.json');
		if (config["settings"] === undefined || config["settings"] == null)
		{
			config[settings]=[];
		}
		if (config["sorc"] === undefined || config["sorc"] == null)
		{
			config[sorcerer]=[];
			config["r"+sorcerer]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[archer]=[];
			config["r"+archer]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[gunner]=[];
			config["r"+gunner]=[];
		}
			
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[priest]=[];
			config["r"+priest]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[mystic]=[];
			config["r"+mystic]=[];
		}

		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[lancer]=[];
			config["r"+lancer]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[brawler]=[];
			config["r"+brawler]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[warrior]=[];
			config["r"+warrior]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[berserker]=[];
			config["r"+berserker]=[];
		}

		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[ninja]=[];
			config["r"+ninja]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[reaper]=[];
			config["r"+reaper]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[valk]=[];
			config["r"+valk]=[];
		}
		if (config["arch"] === undefined || config["arch"] == null)
		{
			config[slayer]=[];
			config["r"+slayer]=[];
		}
		/*
		config["sorc"] ={
			"0": ["skillname", 1]// Skill Number 0 is only for example!
		};*/
	}
	catch(error) //if file not exist this creates new
	{
			config[settings]=[];//settings will be here
		config[sorcerer]=[];
		config["r"+sorcerer]=[];
		config[archer]=[];
		config["r"+archer]=[];
		config[gunner]=[];
		config["r"+gunner]=[];
		
		config[priest]=[];
		config["r"+priest]=[];
		config[mystic]=[];
		config["r"+mystic]=[];

		config[lancer]=[];
		config["r"+lancer]=[];
		config[brawler]=[];
		config["r"+brawler]=[];
		config[warrior]=[];
		config["r"+warrior]=[];
		config[berserker]=[];
		config["r"+berserker]=[];

		config[ninja]=[];
		config["r"+ninja]=[];
		config[reaper]=[];
		config["r"+reaper]=[];
		config[valk]=[];
		config["r"+valk]=[];
		config[slayer]=[];
		config["r"+slayer]=[];
		/*config["sorc"] ={
			"0": ["skillname", 1]
		};*/
		fs.writeFileSync(path.join(__dirname, "config.json"), JSON.stringify(config, null, 2));
		//fs.writeFile(path.join(__dirname, 'config.json'), JSON.stringify(config, null, '\t'), err => {});
	}
	
	// Settings depend variables
	let cClass = config[settings][0];//"sorc"//Current Class
	let cRot = "r"+config[settings][0]; //Current Macros
	
	let enabled = config[settings][1]; //enable module
	
	//Messages
	let testmode = config[settings][2]; //Enable debug messages			//Always on for now
	let abnorm = config[settings][3]; //abnormalities messages
	
	/*//SETTINGS: Class IS_ENABLED IS_Debug IS_Abnorm
	
		config[class]		[SkillNumber]	[skillAttributes]
			  0=sorc		  0=num1	 	 0=skill skill ID
			  1=sorcMacros	  1=num2		 1=skill Name
				13 classes					 3=skill Type of cast
											 4=skill Priority
											 5=skill This Skill>Next Skill Cast Time	//it's timeout for next skill
											 6=skill CD
		Rotaton[Triggering_Skill_ID, Macro_NAME, TRIGGERING_TYPE, IS_ENDLESS, IS_ENABLED, BODY]
	*/
	
	//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX
	//COMMANDS////COMMANDS////COMMANDS////COMMANDS////COMMANDS////COMMANDS////COMMANDS////COMMANDS////COMMANDS//
	//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX//XXXXXXXXXX
	
	// Constructive command
	dispatch.command.add('ar', (x, y, z, a, b, c, d) => {
		if(x==undefined){
			enabled = !enabled;say("Macros " + (enabled ? 'Activated':'Deactivated'), "#FF00FF");
			config[settings][1]=(enabled ? true : false);saveConfig();
		}else{
			
			// Commands
			switch (x) {
/*Set Class*/	case 'class':	// Set current class
					if(y==undefined){say("!ar class [class]", "#FF00FF");break;}
					switch (y) {
						//RANGE
						case 'sorc':
						case 'sorcerer':
							cClass=sorcerer;
							cRot="r"+sorcerer;
							config[settings][0]=sorcerer;
							say("Class is set to "+sorcerer+"","#AA00FF");
						break;
						case 'arch':
						case 'archer':
							cClass=archer;
							cRot="r"+archer;
							config[settings][0]=archer;
							say("Class is set to "+archer+"","#AA00FF");
						break;
						case 'gun':
						case 'gunner':
							cClass=gunner;
							cRot="r"+gunner;
							config[settings][0]=gunner;
							say("Class is set to "+gunner+"","#AA00FF");
						break;
						//HEAL
						case 'myst':
						case 'mystic':
							cClass=mystic;
							cRot="r"+mystic;
							config[settings][0]=mystic;
							say("Class is set to "+mystic+"","#AA00FF");
						break;
						case 'priest':
							cClass=priest;
							cRot="r"+priest;
							config[settings][0]=priest;
							say("Class is set to "+priest+"","#AA00FF");
						break;
						//TANK
						case 'lanc':
						case 'lancer':
							cClass=lancer;
							cRot="r"+lancer;
							config[settings][0]=lancer;
							say("Class is set to "+lancer+"","#AA00FF");
						break;
						case 'brawl':
						case 'brawler':
							cClass=brawler;
							cRot="r"+brawler;
							config[settings][0]=brawler;
							say("Class is set to "+brawler+"","#AA00FF");
						break;
						case 'war':
						case 'warrior':
							cClass=priest;
							cRot="r"+priest;
							config[settings][0]=priest;
							say("Class is set to "+priest+"","#AA00FF");
						break;
						case 'zerk':
						case 'berserker':
							cClass=berserker;
							cRot="r"+berserker;
							config[settings][0]=berserker;
							say("Class is set to "+berserker+"","#AA00FF");
						break;
						//MEELEE
						case 'ninja':
							cClass=ninja;
							cRot="r"+ninja;
							config[settings][0]=ninja;
							say("Class is set to "+ninja+"","#AA00FF");
						break;
						case 'reaper':
							cClass=reaper;
							cRot="r"+reaper;
							config[settings][0]=reaper;
							say("Class is set to "+reaper+"","#AA00FF");
						break;
						case 'valk':
						case 'valkyrie':
							cClass=valk;
							cRot="r"+valk;
							config[settings][0]=valk;
							say("Class is set to "+valk+"","#AA00FF");
						break;
						case 'slayer':
							cClass=slayer;
							cRot="r"+slayer;
							config[settings][0]=slayer;
							say("Class is set to "+slayer+"","#AA00FF");
						break;
						default:
							say("Unknown Class","#FF0000");
						break;
					}
					saveConfig();
				break;
				case 'time':	// Show time Between 2 events
					if(y==undefined||z==undefined){say("!ar time [time2] [time1]", "#FF00FF");break;}
					elapsed(y, z);
				break;
				case 'catch':	// Catch skill id and type
					say("Use skill now", "#00FF00");isCatch=true;
				break;
/*New skill*/	case 'snew': // Add New skill with id=y, name=z
					if(y==undefined||z==undefined||a==undefined||b==undefined||c==undefined||d==undefined){say("!ar snew [id] [name] [type] [priority] [cast time] [cd]", "#FF00FF");break;}
					//check: if ID is not already exist
					dontDoIt=false;if(y=="cat")y=catId;if(a=="cat")a=catType;
					if(config[cClass][0]!=undefined && config[cClass][0]!=null) //IF class have atleast 1 skill defined
					{
						for(let i=0;i<config[cClass].length;i++)
						{
							if(config[cClass][i][0]==y){say('Skill with this id already exists in Number \"'+i+'\" Skill, use command !ar sedit instead', "#FF0000");dontDoIt=true;}
						}
					}
					if(!dontDoIt){
						defineConfig1(cClass);
						cSkillNum=config[cClass].length;
						defineConfig2(cClass, cSkillNum);
						
						config[cClass][cSkillNum][0]=y;//ID
						config[cClass][cSkillNum][1]=z;//NAME
						config[cClass][cSkillNum][2]=a;//TYPE
						config[cClass][cSkillNum][3]=b;//Priority
						config[cClass][cSkillNum][4]=c;//Cast Time
						config[cClass][cSkillNum][5]=d;//CD
						say("New: Skill id: "+y+" Name: "+z+", Type: "+a+", Priority: "+b+", Cast Time: "+c+", CD: "+d, "#FF00FF");
						saveConfig();
					}
				break;
/*Edit Skill*/	case 'sedit': // Edit skill with id "y"
					if(y==undefined||z==undefined){say("!ar sedit [id] [name] [type] [priority] [cast time] [cd] | use [-] to skip argument", "#FF00FF");break;}
					//check: if ID is not already exist
					dontDoIt=false;if(y=="cat")y=catId;if(a=="cat")a=catType;
					if(config[cClass][0]!=undefined && config[cClass][0]!=null) //IF class have atleast 1 skill defined
					{
						for(let i=0;i<config[cClass].length;i++)
						{
							if(config[cClass][i][0]==y)
							{
								dontDoIt=true;
								defineConfig1(cClass);
								defineConfig2(cClass, i);
								
								if(z!='-')config[cClass][i][1]=z;//NAME
								if(a!='-'&&a!=undefined)config[cClass][i][2]=a;//TYPE
								if(b!='-'&&b!=undefined)config[cClass][i][3]=b;//Priority
								if(c!='-'&&c!=undefined)config[cClass][i][4]=c;//Cast Time
								if(d!='-'&&d!=undefined)config[cClass][i][5]=d;//CD
								
								say("Edit: Skill id: "+y+" Name: "+config[cClass][i][1]+", Type: "+config[cClass][i][2]+", Priority: "+config[cClass][i][3]+", Cast Time: "+config[cClass][i][4]+", CD: "+config[cClass][i][5], "#FF00FF");
								saveConfig();
							}
						}
					}
					if(!dontDoIt)say("Skill with id \""+y+"\" didn't found", "#FF0000");
				break;
/*SkillDelete*/	case 'sdel':	// Delete skill with id "y"
					if(y==undefined){say("!ar sdel [id]", "#FF00FF");break;}
					dontDoIt=false;if(y=="cat")y=catId;
					if(config[cClass][0]!=undefined && config[cClass][0]!=null) //IF class have atleast 1 macro defined
					{
						for(let i=0;i<config[cClass].length;i++)
						{
							if(config[cClass][i][0]==y){dontDoIt=true;
							say('Skill with ID \"'+config[cClass][i][0]+'\" and Name '+config[cClass][i][1]+' was removed', "#FF00FF");
							config[cClass].splice(i,1);
							saveConfig();
							}
						}
					}else{say("No Skills for current Class in config", "#FF0000");}
					if(!dontDoIt)
					{
						say("Skill With ID \""+y+"\" Didn't found", "#FF0000");
					}
				break;//splice(index, howmany, item1, ....., itemX)
/*Skill List*/	case 'slist': // Lists all skills of current Class
					if(config[cClass][0]!=undefined && config[cClass][0]!=null) //IF class have atleast 1 skill defined
					{
						tempStr='List of \"'+config[cClass].length+'\" Skills:';
						for(let i=0;i<config[cClass].length;i++)
						{
							tempStr=tempStr+'\n#'+i+' ID: '+config[cClass][i][0]+', Name: '+config[cClass][i][1]+', Type: '+config[cClass][i][2]+', Priority: '+config[cClass][i][3]+', CastTime: '+config[cClass][i][4]+', CD: '+config[cClass][i][5];
						}
						say(tempStr, "#FF00FF");tempStr="";
					}else{say("No skills for current Class in config", "#FF0000");}
				break;
//|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
//|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
/*New Macro*/	case 'mnew':	// Add New Macro with triggering skill id=y, name=z...
					if(y==undefined||z==undefined||a==undefined||b==undefined){say("!ar mnew [id] [name] [type(s|p|r|as|ae|esr|abnb|abne|cd)] [isloop]", "#FF00FF");break;}
					dontDoIt=false;if(y=="cat")y=catId;if(a=="cat")a=catType;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 Macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][0]==y){say('Attention!: This skill id is already used as Trigger in Macro \"'+config[cRot][i][1]+'\", but still will be created.', "#FF7700");}
							if(config[cRot][i][1]==z){say('Macro with name \"'+z+"\" already exist", "#FF0000");dontDoIt=true;}
						}
					}
					if(!dontDoIt){
						defineConfig1(cRot);
						if(config[cRot][0]!=undefined && config[cRot][0]!=null)cRotNum=config[cRot].length;
						defineConfig2(cRot, cRotNum);
						
						config[cRot][cRotNum][0]=y;//ID
						config[cRot][cRotNum][1]=z;//NAME
						if(isNaN(a)){
							switch (a) {
							case 's':
								config[cRot][cRotNum][2]=0;//TYPE
							break;
							case 'p':
								config[cRot][cRotNum][2]=1;
							break;
							case 'r':
								config[cRot][cRotNum][2]=2;
							break;
							case 'as':
								config[cRot][cRotNum][2]=3;
							break;
							case 'ae':
								config[cRot][cRotNum][2]=4;
							break;
							case 'esr':
								config[cRot][cRotNum][2]=5;
							break;
							case 'abnb':
								config[cRot][cRotNum][2]=6;
							break;
							case 'abne':
								config[cRot][cRotNum][2]=7;
							break;
							case 'cd':
								config[cRot][cRotNum][2]=8;
							break;
							}
						}else{config[cRot][cRotNum][2]=a;}
						config[cRot][cRotNum][3]=parseInt(b);//ISLOOP
						say("New: Macro id: "+y+", Name: "+z+", TriggerType: "+a+(b==1 ? ", Loop" : ", NO Loop"), "#FF00FF");
						saveConfig();
					}
				break;
/*EditMacro*/	case 'medit':	// Edit Macro with name "z"...
					if(y==undefined||z==undefined){say("!ar medit [id] [name] [type(s|p|r|as|ae|esr|abnb|abne|cd)] [isloop] | use [-] to skip argument", "#FF00FF");break;}
					dontDoIt=false;if(y=="cat")y=catId;if(a=="cat")a=catType;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 Macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][1]==z)
							{
								dontDoIt=true;
								if(y!='-')config[cRot][i][0]=y;//ID
								if(isNaN(a)){
									switch (a) {
									case 's':
										config[cRot][i][2]=0;//TYPE
									break;
									case 'p':
										config[cRot][i][2]=1;
									break;
									case 'r':
										config[cRot][i][2]=2;
									break;
									case 'as':
										config[cRot][i][2]=3;
									break;
									case 'ae':
										config[cRot][i][2]=4;
									break;
									case 'esr':
										config[cRot][i][2]=5;
									break;
									case 'abnb':
										config[cRot][i][2]=6;
									break;
									case 'abne':
										config[cRot][i][2]=7;
									break;
									case 'cd':
										config[cRot][i][2]=8;
									break;
									case '-':// DIDN'T CHANGED
									break;
									case undefined:// DIDN'T CHANGED
									break;
									}
								}else{config[cRot][i][2]=a;}
								if(b!='-'&&b!=undefined)config[cRot][i][3]=b;//ISLOOP
								say("Edit: Macro id: "+config[cRot][i][0]+", Name: "+config[cRot][i][1]+", TriggerType: "+config[cRot][i][2]+(config[cRot][i][3]==1 ? ", Loop" : ", NO Loop"), "#FF00FF");
								saveConfig();
							}
						}
					}
					if(!dontDoIt)
					{
						say("Macro With Name \""+z+"\" Didn't found", "#FF0000");
					}
				break;
/*NameMacro*/	case 'mname':	// Rename Macro with name "y"...
					if(y==undefined||z==undefined){say("!ar mname [old name] [new name]", "#FF00FF");break;}
					dontDoIt=false;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 Macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][1]==y)
							{
								dontDoIt=true;
								config[cRot][i][1]=z;//Renaming
								say("Macro with Name: "+y+", Renamed to: "+z, "#FF00FF");
								saveConfig();
							}
						}
					}
					if(!dontDoIt)
					{
						say("Macro With Name \""+y+"\" Didn't found", "#FF0000");
					}
				break;
/*AddToMacro*/	case 'madd':	// Add event to Macro with name "y"
					if(y==undefined||z==undefined||a==undefined||b==undefined){say("!ar madd [name] [type(s|p|r|as|ae|esr|abnb|abne|cd)] [id] [delay]", "#FF00FF");break;}
					dontDoIt=false;if(a=="cat")a=catId;if(z=="cat")z=catType;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 Macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][1]==y)//if Name
							{
								j=config[cRot][i].length;
								dontDoIt=true;
								//[Type]:
								//Skill [id, timeout]
								//[0 1 2 3 4]
								
								if(isNaN(z)){
									switch (z) {
									case 's':
										config[cRot][i][j]=0;//TYPE
									break;
									case 'p':
										config[cRot][i][j]=1;
									break;
									case 'r':
										config[cRot][i][j]=2;
									break;
									case 'as':
										config[cRot][i][j]=3;
									break;
									case 'ae':
										config[cRot][i][j]=4;
									break;
									case 'esr':
										config[cRot][i][j]=5;
									break;
									case 'abnb':
										config[cRot][i][j]=6;
									break;
									case 'abne':
										config[cRot][i][j]=7;
									break;
									case 'cd':
										config[cRot][i][j]=8;
									break;
									}
								}else{config[cRot][i][j]=z;}
								config[cRot][i][j+1]=a;//ID
								config[cRot][i][j+2]=b;//Delay
								say("Added: Macro Name: "+y+", Type: "+z+", ID: "+a+", Delay: "+b, "#FF00FF");
								saveConfig();
							}
						}
					}
					if(!dontDoIt)
					{
						say("Macro With Name \""+y+"\" Didn't found", "#FF0000");
					}
				break;
/*EditAddMacro*/case 'maddedit':	// Edit Added event to Macro with name "y"
					if(y==undefined){say("!ar maddedit [name] [type(s|p|r|as|ae|esr|abnb|abne|cd)] [id] [delay] [index] | use [-] to skip argument", "#FF00FF");break;}
					dontDoIt=false;if(a=="cat")a=catId;if(z=="cat")z=catType;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 Macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][1]==y)
							{
								if(config[cRot][i][4]!=undefined)// s id 4 nachinaetsya Body
								{
									j=c*3+4;//MODIFY INDEX
									if(config[cRot][i][j]!=undefined)
									{
										if(isNaN(z)){
											switch (z) {
											case 's':
												config[cRot][i][j]=0;//TYPE
											break;
											case 'p':
												config[cRot][i][j]=1;
											break;
											case 'r':
												config[cRot][i][j]=2;
											break;
											case 'as':
												config[cRot][i][j]=3;
											break;
											case 'ae':
												config[cRot][i][j]=4;
											break;
											case 'esr':
												config[cRot][i][j]=5;
											break;
											case 'abnb':
												config[cRot][i][j]=6;
											break;
											case 'abne':
												config[cRot][i][j]=7;
											break;
											case 'cd':
												config[cRot][i][j]=8;
											break;
											case '-':// DIDN'T CHANGED
											break;
										}
										}else{config[cRot][i][j]=z;}
										if(a!='-')config[cRot][i][j+1]=a;//ID
										if(b!='-')config[cRot][i][j+2]=b;//Delay
										say("Index Edited: Macro Name: "+y+", Type: "+config[cRot][i][j]+", ID: "+config[cRot][i][j+1]+", Delay: "+config[cRot][i][j+2], "#FF00FF");
										saveConfig();
									}else{say("Macro With Name \""+y+"\" Doesn't have index \""+c+"\"", "#FF0000");}
								}else{say("Macro With Name \""+y+"\" Doesn't have Body", "#FF0000");}
								dontDoIt=true;
							}
						}
					}
					if(!dontDoIt)
					{
						say("Macro With Name \""+z+"\" Didn't found", "#FF0000");
					}
				break;
/*ListMacro*/	case 'mlist':	// List all macros for current class
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 macro defined
					{
						tempStr='List of \"'+config[cRot].length+'\" Macros:';
						for(let i=0;i<config[cRot].length;i++)
						{
							tempName=findName(config[cRot][i][0]);
							tempStr=tempStr+'\n#'+i+' Name: '+config[cRot][i][1]+', Trigger skill: '+(tempName!=0 ? tempName : config[cRot][i][0])+', Trigger type: '+config[cRot][i][2]+', IS Loop: '+config[cRot][i][3];
						}
						say(tempStr, "#FF00FF");tempStr="";
					}else{say("No Macros for current Class in config", "#FF0000");}
				break;
/*MacroDetails*/case 'minfo':	// List details of macro with name "y"
					if(y==undefined){say("!ar minfo [name]", "#FF00FF");break;}
					dontDoIt=false;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][1]==y){dontDoIt=true;tempName=findName(config[cRot][i][0]);say('#: '+i+', Name: '+config[cRot][i][1]+', Trigger skill: '+(tempName!=0 ? tempName : config[cRot][i][0])+', Trigger type: '+config[cRot][i][2]+', IS Loop: '+config[cRot][i][3], "#FF00FF");
								for(let p=4;config[cRot][i][p]!=undefined;p+=3)
								{//type id delay
									tempName=findName(config[cRot][i][p+1]);
									tempStr=tempStr+"\n#"+((p-4)/3)+" > w8: "+config[cRot][i][p+2]+" > "+(tempName!=0 ? tempName : config[cRot][i][p+1])+" type: "+config[cRot][i][p];
								}
								if(config[cRot][i][4]!=undefined){say(tempStr, "#FF00FF");tempStr="";}else{say("No Body", "#FF00FF");}
							}
						}
					}else{say("No Macros for current Class in config", "#FF0000");}
					if(!dontDoIt)
					{
						say("Macro With Name \""+y+"\" Didn't found", "#FF0000");
					}
				break;
/*MacroDelete*/	case 'mdel':	// Delete macro with name "y"
					if(y==undefined){say("!ar mdel [name]", "#FF00FF");break;}
					dontDoIt=false;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][1]==y){dontDoIt=true;
							say('Macro with Name \"'+config[cRot][i][1]+'\" was removed', "#FF00FF");
							config[cRot].splice(i,1);
							saveConfig();
							}
						}
					}else{say("No Macros for current Class in config", "#FF0000");}
					if(!dontDoIt)
					{
						say("Macro With Name \""+y+"\" Didn't found", "#FF0000");
					}
				break;
/*TEST2*/		case 'get':
					say("config[cClass] = "+config[cClass], "#FF00FF");
					say("config[cClass][x] = " +config[cClass][y], "#FF00FF");
					say("config[cClass][x][y] = "+config[cClass][y][z], "#FF00FF");
				break;
/*MacroDelPart*/case 'madddel':	// Delete macro with name "y" and index "z"
					if(y==undefined||z==undefined){say("!ar madddel [name] [index]", "#FF00FF");break;}
					dontDoIt=false;
					if(config[cRot][0]!=undefined && config[cRot][0]!=null) //IF class have atleast 1 macro defined
					{
						for(let i=0;i<config[cRot].length;i++)
						{
							if(config[cRot][i][1]==y)
							{
								dontDoIt=true;
								if(config[cRot][i][(z*3+4)]!=undefined)
								{
									say('Action at index '+z+' in Macro with Name \"'+config[cRot][i][1]+'\" was removed', "#FF00FF");
									config[cRot][i].splice((z*3+4),3);
									saveConfig();
								}else{say("Didn't found Action at index "+z+' in Macro with Name \"'+config[cRot][i][1]+'\"', "#FF0000");}
							}
						}
					}else{say("No Macros for current Class in config", "#FF0000");}
					if(!dontDoIt)
					{
						say("Macro With Name \""+y+"\" Didn't found", "#FF0000");
					}
				break;//splice(index, howmany, item1, ....., itemX)
/*TEST2*/		case 'get':
					say("config[cClass] = "+config[cClass], "#FF00FF");
					say("config[cClass][x] = " +config[cClass][y], "#FF00FF");
					say("config[cClass][x][y] = "+config[cClass][y][z], "#FF00FF");
				break;
/*Save Config*/	case 'save':
					saveConfig();
					say("Config Saved", "#FF00FF");
				break;
				default:
					say("command ar "+x+" didn't found", "#FF0000");
				break;
			}
		}
	});
	
	function clr(col,tex){return tex='<font color="' + col + '">' + tex + '</font>';}
	
	dispatch.command.add('auro', (x) => {
		if(x==undefined){
dispatch.command.message(
clr("#FF00FF","Commands:\n")+clr("#00FF00","ar  ")+clr("#FF0000","Mod on/off\n")
+clr("#00FF00","auro help  ")+clr("#FF0000","instructions\n")
+clr("#00FF00","auro macro  ")+clr("#FF0000","show Macro commands\n")
+clr("#00FF00","auro skill  ")+clr("#FF0000","show Skills commands\n")
+clr("#00FF00","ar class ")+clr("#FF00FF","[class]  ")+clr("#FF0000","set current class\n")
+clr("#00FF00","auro debug  ")+clr("#FF0000","Display skill/effects info on/off\n")
+clr("#00FF00","auro abn  ")+clr("#FF0000","Display Abnormality on/off\n")
+clr("#00FF00","ar catch  ")+clr("#FF0000","Catch ID and Type of skill\n")
+clr("#00FF00","ar time ")+clr("#FF00FF","[x] [y]  ")+clr("#FF0000","Time = (x - y)")
);
		}else if(x=='skill'){say("only Skills arguments Name and ID is used for displaying Names of skills instead of ID, other arguments currently completly useless and can be set to 0.","#FF0000");
dispatch.command.message(clr("#FF00FF","If you catched skill - type ")+clr("#00FF00","cat ")+clr("#FF00FF","instead of ID and Type\n")
+clr("#00FF00","ar snew ")+clr("#FFFF00","[id] [name] [type] [priority] [cast time] [cd]  ")+clr("#FF0000","Write info about skill in config\n")
+clr("#00FF00","ar sedit ")+clr("#FFFF00","[id] [name] [type] [priority] [cast time] [cd]  ")+clr("#FF0000","Edit by ID, use \"-\" to skip arguments\n")
+clr("#00FF00","ar slist  ")+clr("#FF0000","Lists all skills in config for current class")
);
		}else if(x=='macro'){
dispatch.command.message(
clr("#00FF00","ar mnew ")+clr("#FFFF00","[Triggering skill id] [Name] [Triggering Type] [ISRepeat]  ")+clr("#FF0000","Creates new Macro\n")
+clr("#00FF00","ar medit ")+clr("#FFFF00","[Triggering skill id] [Name] [Triggering Type] [ISRepeat]  ")+clr("#FF0000","Edit by Name, use [-] to skip argument)\n")
+clr("#00FF00","ar mname ")+clr("#FFFF00","[old name] [new name]  ")+clr("#FF0000","Rename Macro\n")
+clr("#00FF00","ar mdel ")+clr("#FFFF00","[name]  ")+clr("#FF0000","Delete Macro\n")
+clr("#00FF00","ar madd ")+clr("#FFFF00","[Name] [Triggering Type] [ID] [Delay]  ")+clr("#FF0000","Add Action to Macro\n")
+clr("#00FF00","ar maddedit ")+clr("#FFFF00","[Name] [Triggering Type] [ID] [Delay] [index]  ")+clr("#FF0000","use [-] to skip argument\n")
+clr("#00FF00","ar madddel ")+clr("#FFFF00","[name] [index]  ")+clr("#FF0000","Delete Macro Action at Index\n")
+clr("#00FF00","ar mlist  ")+clr("#FF0000","Lists all macros in config for current class\n")
+clr("#00FF00","ar minfo ")+clr("#FFFF00","[name]  ")+clr("#FF0000","Show Macro Actions\n")
+clr("#00FF44","auro mnewinfo ")+clr("#FF0000","mnew arguments info")
);
		}else if(x=='abn'){
			abnorm = !abnorm;say("Abnormality Display: " + (abnorm ? 'Enabled':'Disabled'),"#FF00FF");
			config[settings][3]=(abnorm ? true : false);saveConfig();
		}else if(x=='debug'){
			testmode = !testmode;say("Debug Messages Display: " + (testmode ? 'Enabled':'Disabled'),"#FF00FF");
			config[settings][2]=(testmode ? true : false);saveConfig();
		}else if(x=='info' ||x=='help'){
dispatch.command.message(clr("#FF00FF","How to create macro:\n")
+clr("#FF00FF","1 > ")+clr("#00FF00","Enable Mod(command: ")+clr("#FF0000","!ar")
+clr("#00FF00",")\n")+clr("#00FF00","Set class: ")+clr("#FF0000","!ar class ")+clr("#FF7700","[class]\n")
+clr("#FF00FF","2 > ")+clr("#FF0000","!ar catch ")+clr("#00FF00","Now cast skill you want to use as Macro trigger\n")
+clr("#FF00FF","3 > ")+clr("#FF0000","!ar mnew ")+clr("#FF7700","cat Nyan cat 0\n")+clr("#00FF00","Here we Created new Macro with name ")+clr("#FF7700","Nyan ")+clr("#00FF00","and with catched(")+clr("#FF7700","cat")+clr("#00FF00",") ID and Type of skill\n")
+clr("#FF00FF","4 > ")
+clr("#00FF00","To get skill cast time - enable skills info - ")+clr("#FF0000","!auro debug\n")
+clr("#FF00FF","5 > ")+clr("#00FF00","Now again cast skill you used as trigger, and after - cast any other skill as fast, as possible\n")
+clr("#FF00FF","6 > ")+clr("#00FF00","You will see message like this:\n")+clr("#0077FF","T4: C_START_SKILL... \n")
+clr("#00FF00","Digit (")+clr("#0077FF","4 ")+clr("#00FF00","in our example) will be used to get time from 1st to 2nd Skill cast: ")+clr("#FF0000","!ar time ")+clr("#FFFF00","[2nd] [1st]\n")
+clr("#FF00FF","7 > ")+clr("#00FF00","Catch 2nd Skill: ")+clr("#FF0000","!ar catch ")+clr("#00FF00","Now use ")+clr("#0077FF","Time")+clr("#00FF00"," you got at ")+clr("#FF00FF","step 6 ")+clr("#00FF00","as Delay to Add Action to your Macro: ")+clr("#FF0000","!ar madd ")+clr("#FF7700","Nyan cat cat ")+clr("#0077FF","Time\n")
+clr("#00FF00","Now try to trigger your skill. If you did all right - you will see 2nd skill Activating. If 2nd hit too early - increace ")+clr("#0077FF","Time")+clr("#00FF00",", or decreace if you want. This way you can add as many Skills as you want and see all things you added by using command ")+clr("#FF0000","!ar minfo ")+clr("#00FF00","and ")+clr("#FF0000","!ar mlist")
);
		}else if(x=='mnewinfo'){
					say("mnew x = skill that trigger Macro\n"+
					"y = Macro Name\n"+
					"z = Triggering Type:\n"+//s p r as ae esr abnb abne cd
					"Arg: s - C_START_SKILL\n"+
					"Arg: p - C_PRESS_SKILL(PRESS)\n"+
					"Arg: r - C_PRESS_SKILL(RELEASE)\n"+
					"Arg: as - S_ACTION_STAGE\n"+
					"Arg: ae - S_ACTION_END\n"+
					"Arg: esr - S_EACH_SKILL_RESULT\n"+
					"Arg: abnb - S_ABNORMALITY_BEGIN\n"+
					"Arg: abne - S_ABNORMALITY_END\n"+
					"Arg: cd - S_START_COOLTIME_SKILL\n"+
					"Arg: s - C_START_SKILL\n"+
					"a = Repeat after end: 0 - no, 1 - yes\n"+
					"Example: !ar mnew 111100 lightstrike s 0\n"
					, "#FF00FF");
		}
	});
																	///////////////////C_START_INSTANCE_SKILL////////////////////////////////
	function execute(rot,rnum,indx)
	{
		if(config[rot][rnum][indx]==0) {//TYPE
			setTimeout(() => {startSkill(config[rot][rnum][indx+1]);
			if(config[rot][rnum][indx+3]!=undefined){execute(rot,rnum,indx+3);}//continue executing
			},
			config[rot][rnum][indx+2]);//Delay
		}
	}
	
	// Core Event | a=skill ID, b=event type[0=Start,1=Press,2=Release,3=ActionStage,4=ActionEnd,5=EachSkilResu,6=AbnBeg, 7=AbnEnd,8=StartCooldown], c=optional_parameter
	function eve(a, b=undefined, c=undefined)	//Events from Hooks
	{
		if(isCatch){isCatch=false;catId=a;catType=b;say("Skill with id "+a+" and type "+b+" Catched!","#FF00FF");}
		if(bait)
		{
			for(let i=0;i<config[cRot].length;i++)// i=index rotacii, i[0]=triggering skill
			{
				if(config[cRot][i][0]==a)
				{
					if(config[cRot][i][2]==b)
					{
						if(config[cRot][i][5]!=undefined)
						{
							execute(cRot,i,4);
							
						}
					}
				}
			}
		}
	}
	
	function findName(id){//TO find name of skill
		if(config[cClass][0]!=undefined && config[cClass][0]!=null)
		{
			for(let i=0;i<config[cClass].length;i++)
			{
				if(config[cClass][i][0]==id){return config[cClass][i][1];}
			}
			return 0;
		}else{return 0;}
	}
	
	//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
	//EVENTS////EVENTS////EVENTS////EVENTS////EVENTS////EVENTS////EVENTS////EVENTS////EVENTS////EVENTS////EVENTS//
	//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
	
	// Called when item used
	dispatch.hook('C_USE_ITEM', 3, event => {
		if(enabled && (event.id==206004 || event.id==206003 || event.id==206002 || event.id==206001 || event.id==206000))
		{
			//bait = !bait;say("Macro " + (bait ? 'Enabled':'Paused'), "#FF00FF");
			
			//setTimeout(startSkill(argskillid), (bto));//bto - Bait>Skill Timeout
			//setTimeout(sendAttack, (timeout));
		}
	});
	
	// Called when you start skill
    dispatch.hook('C_START_SKILL', 7, ONLY_USER_HOOK, event => {
		if(enabled){eve(event.skill.id,0);getTime();debug('T'+timeid+': C_START_SKILL(User): ' + event.skill.id, "#0077FF");}
    });
	
	// Called when you press/release skill
	dispatch.hook('C_PRESS_SKILL', 4, ONLY_USER_HOOK, event => {
		//event.skill.id
		//event.press //true - pressed
		if (enabled){eve(event.skill.id, (event.press ? 1 : 2));	getTime();
			debug('T'+timeid+': C_PRESS_SKILL(User) ' + (event.press ? '\"P\"' : '\"R\"') + ': ' + event.skill.id, "#0077FF");}
	});
	
	// Called when??? can i use it to disable or fake anything?..
    dispatch.hook('S_ACTION_STAGE', 8, event => { //, {order: -1000000, filter: {fake: null}} //to hook only crafted
        if (!enabled || !(event.gameId == gameId)) return;
		eve(event.skill.id,3); getTime();
		abn('T'+timeid+': S_ACTION_STAGE: ' + event.skill.id, "#00FF00");
		//it's example from op-zerk
       /* if ([SKILL_DEXTER.toString().substring(0, 4), SKILL_SINISTER.toString().substring(0, 4)].includes(event.skill.id.toString().substring(0, 4))) {
            return false;
        }*/
    });
	
	// Called when??? can i use it to disable or fake anything?..
    dispatch.hook('S_ACTION_END', 5, {order: -1000000, filter: {fake: null}}, event => {
        if (!enabled || !(event.gameId == gameId)) return;
		eve(event.skill.id,4); getTime();
		abn('T'+timeid+': S_ACTION_END: ' + event.skill.id, "#00FF00");
		//it's example from op-zerk
        /*if ([SKILL_DEXTER.toString().substring(0, 4), SKILL_SINISTER.toString().substring(0, 4)].includes(event.skill.id.toString().substring(0, 4))) {
            return false;
        }*/
    });
	
	// Called when skill hit target
	//dispatch.hook("S_EACH_SKILL_RESULT", 12, { filter: { fake: null }}, sEachSkillResult);
	dispatch.hook('S_EACH_SKILL_RESULT', 12, (event) => {
		if (!enabled) return;
		eve(event.skill.id,5); getTime();
		abn('T'+timeid+': S_EACH_SKILL_RESULT: ' + event.skill.id + ', target: ' + event.target + ', Owner: ' + ((event.owner==0) ? event.source : event.owner), "#FF0000");
		//skillHit(event.skill);
	})
	
	// Called when Abnormality(buff/effect) BEGIN
    dispatch.hook('S_ABNORMALITY_BEGIN', 3, (event) => {
        if (!enabled || !(event.target == gameId)) return; //return if it's not your abnormality
		eve(event.id,6); getTime();
		abn('T'+timeid+': S_ABNORMALITY_BEGIN: '+event.id, "#FFFF00");
        if (event.id == abnormalityid) {
			
        }
    });
	//Abnorm - Yellow, CodePress - Pink, Hit - Red, Action - Green, UserPress - Blue
	// Called when Abnormality(buff/effect) END
    dispatch.hook('S_ABNORMALITY_END', 1, (event) => {
		if (!enabled || !(event.target == gameId)) return;
		eve(event.id,7); getTime();
		abn('T'+timeid+': S_ABNORMALITY_END: '+event.id, "#FFFF00");
		if(event.id == abnormalityid){
			
		}
	});
	
	// Called when server sends you cooldown info
	dispatch.hook('S_START_COOLTIME_SKILL', 3, (event)=>{ 
		if(enabled)
		{
			eve(event.skill.id,3);	//CHANGE IT LATER!!
			if(nocooldown){
				//event.skillid
				event.cooldown=0;return true; //disable client cd
			}
		}
	});	
	
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	//GETTING INFO////GETTING INFO////GETTING INFO////GETTING INFO////GETTING INFO////GETTING INFO////GETTING INFO//
	//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
	
	// AttackSpeed, HP
    dispatch.hook('S_PLAYER_STAT_UPDATE', 10, ONLY_USER_HOOK, event => {
        attackSpeed = (event.attackSpeed + event.attackSpeedBonus) / event.attackSpeed;
        if (event.hp == 0) {
			//when you are dead
        }
    });
	// Location, Destination, Where you look
	dispatch.hook('C_PLAYER_LOCATION', 5, ONLY_USER_HOOK, event => {
        xloc = event.dest.x;
        yloc = event.dest.y;
        zloc = event.dest.z;
		loc = event.loc;
		w = event.w;
	});
	// GameId, Class
	
    dispatch.hook('S_LOGIN', 10, ONLY_USER_HOOK, event => {
        model = event.templateId;//used to get player class
        //job = (model - 10101) % 100;
        //enabled = [JOB_ZERK].includes(job);
    });
	
	//###################################################################################################################
	//FUNCTIONS////FUNCTIONS////FUNCTIONS////FUNCTIONS////FUNCTIONS////FUNCTIONS////FUNCTIONS////FUNCTIONS////FUNCTIONS//
	//###################################################################################################################
	
	// For 1-hit skills
	function startSkill(argskillid) {
		getTime();
		dispatch.toServer('C_START_SKILL', 7, {
			skill: { reserved: 0, npc: false, type: 1, huntingZoneId: 0, id: argskillid },
			loc: loc,
			w: w,
			dest: { x: 0, y: 0, z: 0 },
			unk: true,
			moving: false,
			target: 0, //{ low: 0, high: 0, unsigned: true },
			unk2: false
		});
		debug('T'+timeid+': C_START_SKILL(Code): ' + argskillid, "#FF00FF");
	}
	// Press Skill
	function pressSkill(argskillid) { //press block/charge/lockon skills
		getTime();
		dispatch.toServer('C_PRESS_SKILL', 4, {
			skill: { reserved: 0, npc: false, type: 1, huntingZoneId: 0, id: argskillid },
			press: true,
			loc: loc,
			w: w
		});
		debug('T'+timeid+': C_PRESS_SKILL(Code) \"P\": ' + argskillid, "#FF00FF");
	}
	// Release Skill
	function releaseSkill(argskillid) { //release block/charge/lockon skills
		getTime();
		dispatch.toServer('C_PRESS_SKILL', 4, {
			skill: { reserved: 0, npc: false, type: 1, huntingZoneId: 0, id: argskillid },
			press: false,
			loc: loc,
			w: w
		});
		debug('T'+timeid+': C_PRESS_SKILL(Code) \"R\": ' + argskillid, "#FF00FF");
	}
	
	// Time calculation
	function getTime() {
		timeid++;if(timeid>=20)timeid=0;
		time[timeid] = new Date().getTime();
	}
	
	function elapsed(t1, t2) {
		if(t1 >= 0 && t1 <=19 && t2 >= 0 && t2 <=19 ){
			elapsedTime = time[t1] -  time[t2];
			dispatch.command.message("Time: T" + t1 + ' - ' + 'T' + t2 + ' = ' + elapsedTime);
		}else{say('Make sure time1 and time2 >=0 and <=19', "#FF0000")}
	}
	
	// Messages
	function say(msg, color="#ffffff") {
		dispatch.command.message('<font color="' + color + '">' + msg + '</font>');
	}
	
	function debug(msg, color="#ffffff") {
		if(testmode) dispatch.command.message('<font color="' + color + '">' + msg + '</font>');
	}
	function abn(msg, color="#ffffff") {
		if(abnorm) dispatch.command.message('<font color="' + color + '">' + msg + '</font>');
	}
	
	
	// Save Config
	function saveConfig() {
		fs.writeFile(path.join(__dirname, 'config.json'), JSON.stringify(config, null, '\t'), err => {});
	}
	
	// Define Config1//  (class/Macro)
	function defineConfig1(cCl){
		if(config[cCl]==undefined||config[cCl]==null){config[cCl] =[];} //{"0": ["skillname", 1]}
	}
	// Define Config2//  (Skill/Macro Number)
	function defineConfig2(cCl, num){
		if(config[cCl][num]==undefined||config[cCl][num]==null){config[cCl][num]=[];}
	}
	// Reload Config
	function reloadConfig(){
		delete require.cache[require.resolve("./config.js")];
		Object.assign(config, require("./config.js"));
		say("Configuration file has been reloaded", "#ff00ff");
	}
	
	this.destructor = function() {
		dispatch.command.remove('ar');
		dispatch.command.remove('auro');
		delete require.cache[require.resolve('./config.json')];//   ./_config.json
	}
}