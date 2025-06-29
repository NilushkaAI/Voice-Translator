// Get references to HTML elements
const inputLanguageSelect = document.getElementById('inputLanguage');
const outputLanguageSelect = document.getElementById('outputLanguage');
const toggleRecognitionBtn = document.getElementById('toggleRecognitionBtn');
const buttonText = document.getElementById('buttonText');
const loadingSpinner = document.getElementById('loadingSpinner');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');

// New element for requested feature
const switchLanguagesBtn = document.getElementById('switchLanguagesBtn');
// const voiceGenderSelect = document.getElementById('voiceGenderSelect'); // Removed voice selection element

// Speech Recognition and Synthesis objects
let recognition;
let isRecognizing = false;
const synth = window.speechSynthesis;
// let availableVoices = []; // Removed as voice selection is removed

// Supported languages for Speech Recognition and Synthesis
// Note: Not all languages supported by Gemini API are supported by Web Speech API.
// We prioritize common ones for demonstration.
const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'ko-KR', name: 'Korean (Korea)' },
    { code: 'zh-CN', name: 'Chinese (Mandarin, China)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ru-RU', name: 'Russian (Russia)' },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
    { code: 'ta-LK', name: 'Tamil (Sri Lanka)' }, // Added Tamil for Sri Lanka context
    { code: 'si-LK', name: 'Sinhala (Sri Lanka)' } // Added Sinhala for Sri Lanka context
];

/**
 * Populates the language dropdowns with available options.
 */
function populateLanguageDropdowns() {
    languages.forEach(lang => {
        const optionInput = document.createElement('option');
        optionInput.value = lang.code;
        optionInput.textContent = lang.name;
        inputLanguageSelect.appendChild(optionInput);

        const optionOutput = document.createElement('option');
        optionOutput.value = lang.code;
        optionOutput.textContent = lang.name;
        outputLanguageSelect.appendChild(optionOutput);
    });

    // Set default languages
    inputLanguageSelect.value = 'en-US';
    outputLanguageSelect.value = 'es-ES';
}

/**
 * Populates the voice selection dropdown based on the selected output language,
 * offering only 'Male Voice' and 'Female Voice' options if available.
 * This function is no longer needed as voice selection is removed.
 */
// function populateVoiceDropdown() {
//     // Function removed
// }


/**
 * Toggles the loading spinner visibility.
 * @param {boolean} show - True to show, false to hide.
 */
function toggleLoadingSpinner(show) {
    if (show) {
        loadingSpinner.classList.add('active');
        toggleRecognitionBtn.disabled = true;
    } else {
        loadingSpinner.classList.remove('active');
        toggleRecognitionBtn.disabled = false;
    }
}

/**
 * Initializes the Speech Recognition object.
 */
function initSpeechRecognition() {
    // Check for Web Speech API support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toggleRecognitionBtn.disabled = true;
        return;
    }

    // Use webkitSpeechRecognition for broader compatibility with Chrome/Edge
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = false; // Only return final results for translation
    recognition.lang = inputLanguageSelect.value; // Set language based on selected input

    // Event handlers for speech recognition
    recognition.onstart = () => {
        isRecognizing = true;
        buttonText.textContent = 'Stop Translation';
        toggleRecognitionBtn.classList.remove('bg-indigo-600');
        toggleRecognitionBtn.classList.add('bg-red-600');
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            inputText.value = finalTranscript;
            translateText(finalTranscript);
        }
    };

    recognition.onerror = (event) => {
        isRecognizing = false;
        buttonText.textContent = 'Start Translation';
        toggleRecognitionBtn.classList.remove('bg-red-600');
        toggleRecognitionBtn.classList.add('bg-indigo-600');
        toggleLoadingSpinner(false);
    };

    recognition.onend = () => {
        if (isRecognizing) {
            // This might happen if there's a pause. Restart recognition.
        }
    };
}

/**
 * Translates text using the Gemini API.
 * @param {string} textToTranslate - The text to be translated.
 */
async function translateText(textToTranslate) {
    toggleLoadingSpinner(true);

    const inputLangCode = inputLanguageSelect.value.split('-')[0]; // e.g., 'en' from 'en-US'
    const outputLangCode = outputLanguageSelect.value.split('-')[0]; // e.g., 'es' from 'es-ES'

    // Modified prompt to explicitly ask for only the translated text
    const prompt = `Translate "${textToTranslate}" from ${inputLangCode} to ${outputLangCode}. Provide only the translated text.`;

    try {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };
        // API Key
        const apiKey = "AIzaSyDTTqivhDq5t3WU_KMHdeXghIZvexqnoi0";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            let translatedText = result.candidates[0].content.parts[0].text;

            // Attempt to remove leading/trailing asterisks if the model adds them
            translatedText = translatedText.replace(/^\*\*|\*\*$/g, '').trim();

            outputText.value = translatedText;
            speakTranslatedText(translatedText, outputLanguageSelect.value);
        } else {
            // Removed console.error for clean output
        }
    } catch (error) {
        // Removed console.error for clean output
    } finally {
        toggleLoadingSpinner(false);
    }
}

/**
 * Speaks the translated text using Speech Synthesis.
 * @param {string} text - The text to speak.
 * @param {string} langCode - The language code for synthesis (e.g., 'es-ES').
 */
function speakTranslatedText(text, langCode) {
    if (synth.speaking) {
        synth.cancel(); // Stop any ongoing speech
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;

    // Voice selection logic removed, browser will pick default voice for the language
    synth.speak(utterance);
}

/**
 * Swaps the input and output languages.
 */
function switchLanguages() {
    const currentInput = inputLanguageSelect.value;
    const currentOutput = outputLanguageSelect.value;

    inputLanguageSelect.value = currentOutput;
    outputLanguageSelect.value = currentInput;

    // Update recognition language if active
    if (isRecognizing) {
        recognition.lang = inputLanguageSelect.value;
    }
    // populateVoiceDropdown() call removed
}

// Event listener for the start/stop button
toggleRecognitionBtn.addEventListener('click', () => {
    if (isRecognizing) {
        recognition.stop();
        isRecognizing = false;
        buttonText.textContent = 'Start Translation';
        toggleRecognitionBtn.classList.remove('bg-red-600');
        toggleRecognitionBtn.classList.add('bg-indigo-600');
    } else {
        // Clear previous text areas
        inputText.value = '';
        outputText.value = '';
        initSpeechRecognition(); // Re-initialize to ensure correct language setting
        recognition.start();
    }
});

// Event listener for input language change
inputLanguageSelect.addEventListener('change', () => {
    // Update recognition language if active
    if (recognition) {
        recognition.lang = inputLanguageSelect.value;
    }
});

// Event listener for output language change
outputLanguageSelect.addEventListener('change', () => {
    // populateVoiceDropdown() call removed
});

// Event listener for language switch button
switchLanguagesBtn.addEventListener('click', switchLanguages);

// Populate voices when they are loaded - this listener is no longer strictly needed but harmless
// synth.onvoiceschanged = () => {
//     availableVoices = synth.getVoices();
//     populateVoiceDropdown(); // This call is now redundant but safe
// };

// Initialize on page load
window.onload = () => {
    populateLanguageDropdowns();
    // Initial check for Web Speech API support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toggleRecognitionBtn.disabled = true;
    } else {
        // App is ready
    }
    // populateVoices immediately if they are already loaded - this is now redundant
    // if (synth.getVoices().length > 0) {
    //     availableVoices = synth.getVoices();
    // }
};
