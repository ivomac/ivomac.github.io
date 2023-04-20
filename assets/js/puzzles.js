

async function displayPuzzles() {
	const response = await fetch("/assets/data/yes_no.json");
	const PuzzlesData = await response.json();

	const difficulty = document.getElementById("script").getAttribute('difficulty');

	const PuzzlesContainer = document.getElementById("puzzles");

	for (const PuzzleId in PuzzlesData) {
		const puzzle = PuzzlesData[PuzzleId];

		if (puzzle.difficulty !== difficulty) {
			continue;
		}

		const PuzzleElement = document.createElement("div");
		PuzzleElement.classList.add("puzzle");

		const TitleElement = document.createElement("div");
		TitleElement.innerText = `${PuzzlesContainer.children.length + 1}. ${PuzzleId}`;
		TitleElement.classList.add("title");

		const QuestionElement = document.createElement("p");
		QuestionElement.classList.add("question");
		QuestionElement.innerText = puzzle.question;

		const AnswerElement = document.createElement("p");
		AnswerElement.classList.add("answer");
		AnswerElement.innerText = puzzle.answer;

		PuzzleElement.appendChild(TitleElement);
		PuzzleElement.appendChild(QuestionElement);
		PuzzleElement.appendChild(AnswerElement);

		TitleElement.addEventListener("click", () => {
			TitleElement.classList.toggle("show");
			QuestionElement.classList.toggle("show");
			AnswerElement.classList.remove("show");
		});

		QuestionElement.addEventListener("click", () => {
			AnswerElement.classList.toggle("show");
		});

		PuzzlesContainer.appendChild(PuzzleElement);
	}

}

document.addEventListener("DOMContentLoaded", displayPuzzles);

