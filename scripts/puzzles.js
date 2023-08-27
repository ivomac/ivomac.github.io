
async function displayPuzzles() {
	const response = await fetch('/yes_no/data.json');
	const PuzzlesData = await response.json();

	const difficulty = document.getElementById("script").getAttribute('difficulty');;

	const PuzzlesContainer = document.getElementById("puzzles");

	for (const PuzzleId in PuzzlesData) {
		const puzzle = PuzzlesData[PuzzleId];

		if (puzzle.difficulty !== difficulty) {
			continue;
		}

		const PuzzleElement = document.createElement('div');
		PuzzleElement.classList.add('puzzle');

		const TitleElement = document.createElement('h2');
		TitleElement.innerText = PuzzleId;

		const QuestionElement = document.createElement('h3');
		QuestionElement.classList.add('question');
		QuestionElement.innerText = puzzle.question;

		const AnswerElement = document.createElement('p');
		AnswerElement.classList.add('answer');
		AnswerElement.innerText = puzzle.answer;

		PuzzleElement.appendChild(TitleElement);
		PuzzleElement.appendChild(QuestionElement);
		PuzzleElement.appendChild(AnswerElement);

		TitleElement.addEventListener('click', () => {
			QuestionElement.classList.toggle('show');
			AnswerElement.classList.remove('show');
		});

		QuestionElement.addEventListener('click', () => {
			AnswerElement.classList.toggle('show');
		});

		PuzzlesContainer.appendChild(PuzzleElement);
	}

}

document.addEventListener('DOMContentLoaded', displayPuzzles);

