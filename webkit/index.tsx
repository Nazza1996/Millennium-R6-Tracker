import Widget from "./widget";
import { callable, Millennium } from "@steambrew/webkit";

const getCache = callable<[], any>("read_cache");

export default async function WebkitMain() {
	const rightCol = await Millennium.findElement(document, '.profile_rightcol');
	
	if (rightCol.length > 0) {
		const col = rightCol[0];
		const countLinkArea = col.querySelector('.responsive_count_link_area');

		const title = document.createElement("a");
		title.textContent = "Rainbow Six Siege Stats";
		title.style = `
			cursor: auto;
			font-size: 14px;
			margin-bottom: 5px;
		`
		col.insertBefore(title, countLinkArea);

		let cache = await getCache();
		cache = JSON.parse(cache);

		const widget = new Widget(cache ? cache : {});
		col.insertBefore(widget.getElement(), countLinkArea);
	}
}
