import {Markup, Telegraf} from 'telegraf';
import axios from 'axios';

/**
 * @type Array<{{
 *     question: string,
 *     answers: string,
 *     rightAnswer: string,
 *     explanation: string,
 * }}>
 */
let questions;

/**
 * @type {{
 *     question: string,
 *     answers: string,
 *     rightAnswer: string,
 *     explanation: string,
 * }}
 */
let currentQuestion;

/**
 * @type {Array<string>}
 */
let currentAnswers;

/**
 * @type {string}
 */
let currentExplain;

/**
 * @type {string}
 */
let userAnswer = '';

async function nextQuestion(ctx) {
    if (!questions) {
        await loadQuestions();
    }
    userAnswer = '';
    const index = Math.floor(Math.random() * questions.length);
    fetchNextQuestionInfo(index);
    await ctx.reply(`
        Вопрос #${index}
        ${(currentQuestion.question)}
    `);
    const answerKeyboard = getAnswerKeyboard();
    await ctx.replyWithHTML('Каким будет вывод?', answerKeyboard);
}

function fetchNextQuestionInfo(index) {
    currentQuestion = questions[index];
    const {answers, explanation, rightAnswer} = currentQuestion;
    currentAnswers = answers.split('\n').filter(Boolean);
    const answer = currentAnswers.find((x) => rightAnswer === x[0]);
    currentExplain = `
        ✨ ${answer}
        ${explanation.replaceAll('<br>', '')}
    `;
}

async function loadQuestions() {
    const questionsFile = 'https://thebestcode.ru/public/js/questions/questions.js';
    const response = await axios.get(questionsFile);
    const questionsString = response.data.substring(15).replace(/\/\/.+$/gm, '');
    questions = eval(questionsString);
}

function getButtonConfig(answer, markAnswers) {
    let text = answer;
    const {rightAnswer} = currentQuestion;
    const answerData = answer[0];
    if (markAnswers) {
        const isRightAnswer = answerData === rightAnswer;
        const isUserAnswer = answerData === userAnswer;
        if (isRightAnswer || isUserAnswer) {
            text = isRightAnswer ? `✅ ${answer}` : `❌ ${answer}`;
        }
    }
    return [text, answerData];
}

function getAnswerKeyboard(markAnswers = false, hideExplain = false) {
    const buttons = currentAnswers
        .map((answer) => getButtonConfig(answer, markAnswers))
        .map((config) => Markup.button.callback(...config));
    if (!markAnswers) {
        buttons.push(
            Markup.button.callback('🔠 Показать ответ', 'ANSWER'),
        );
    } else {
        if (!hideExplain) {
            buttons.push(
                Markup.button.callback('✨ Показать решение', 'EXPLAIN'),
                Markup.button.callback('⏭️ Следующий вопрос', 'NEXT'),
            );
        }
    }
    return Markup.inlineKeyboard(buttons, {columns: 1});
}

function setUserAnswer(data) {
    userAnswer = data;
}

async function editAnswers(ctx, hideExplain) {
    const answerKeyboard = getAnswerKeyboard(true, hideExplain);
    await ctx.editMessageText('Каким будет вывод?', answerKeyboard);
}

const bot = new Telegraf('1662564024:AAFGfstLfkq8gbV8U4d7i61uu2ey1kRQ80c')

bot.start(async (ctx) => {
    await nextQuestion(ctx);
});

bot.action(['A', 'B', 'C', 'D', 'ANSWER'], async (ctx) => {
    if (!currentQuestion || userAnswer) {
        return;
    }
    setUserAnswer(ctx.callbackQuery.data);
    await editAnswers(ctx);
});

bot.action(['EXPLAIN'], async (ctx) => {
    if (!userAnswer) {
        return;
    }
    await editAnswers(ctx, true);
    await ctx.replyWithHTML(
        currentExplain,
        Markup.inlineKeyboard([
            Markup.button.callback('⏭️ Следующий вопрос', 'NEXT'),
        ]),
    );
});

bot.action(['NEXT'], async (ctx) => {
    try {
        await ctx.editMessageText(currentExplain);
    } catch(e) {}
    await nextQuestion(ctx)
});

await bot.launch();

console.log('Bot launched!');
