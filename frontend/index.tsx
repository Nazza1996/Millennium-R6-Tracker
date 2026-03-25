import { Millennium, IconsModule, definePlugin, Field, DialogButton, callable } from '@steambrew/client';
import { useEffect, useState } from 'react';

function windowCreated(_context: any) {
	// window create event.
	// you can interact directly with the document and monitor it with dom observers
	// you can then render components in specific pages.
}

const getCache = callable<[], any>("read_cache");
const clearCache = callable<[], void>("clear_cache");

const SettingsContent = () => {
	const [entries, setEntries] = useState<number>(0);

	useEffect(() => {
		const fetchCacheData = async () => {
			const cacheData = await getCache();
			setEntries(Object.keys(JSON.parse(cacheData)).length);
		}
		fetchCacheData();
	}, []);

	return (
		<>
			<Field label="Cache Status" description={`${entries} user entries cached`} bottomSeparator="standard">
				<DialogButton
					style={{ padding: "5px 10px" }}
					onClick={async () => {
						await clearCache();
						setEntries(0);
					}}
				>
					Clear Cache
				</DialogButton>
			</Field>
			
			<Field label="Reminder" description="Make sure to refresh active pages after clearing the cache!" bottomSeparator='standard' />
		</>
	);
};

export default definePlugin(() => {
	Millennium.AddWindowCreateHook(windowCreated);

	return {
		title: 'R6 Stats Tracker',
		icon: <IconsModule.Settings />,
		content: <SettingsContent />,
	};
});
