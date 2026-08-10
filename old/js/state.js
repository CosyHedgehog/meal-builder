/**
 * Global application state: in-memory data (ingredients, meals, snacks,
 * logs) and UI state flags shared across all modules.
 */

const DEFAULT_MAINTENANCE = 2200;

let ingredients = [];
let meals = [];
let snacks = [];
let logs = {}; // dateStr (YYYY-MM-DD) -> log entry
let maintenanceCal = DEFAULT_MAINTENANCE;
let openMealId = null;
let ingModalOpen = false;
let ingModalView = 'list';
let ingEditorId = null;
let ingEditorReturnTo = 'ingredientsModal';
let transferModalOpen = false;
let historyModalOpen = false;
let dataLoaded = false;
let ingSearchTerm = '';
let managerMealSearchTerm = '';
let managerSnackSearchTerm = '';
let managerIngredientSearchTerm = '';
let ingDragFromId = null;
let itemDragFromId = null;
let logDate = todayStr();
let foodManagerTab = 'meals';

const DEFAULT_SNACKS = [
  {id:'snack-apple', name:'Apple', kcal:95},
  {id:'snack-banana', name:'Banana', kcal:105},
  {id:'snack-orange', name:'Orange', kcal:62},
  {id:'snack-sardines', name:'Sardines (tin)', kcal:220}
];

function defaultLogEntry(){
  return {mode:'meal', mealId:null, mealServings:1, manualMealName:'', manualMealKcal:0, snacks:[]};
}
