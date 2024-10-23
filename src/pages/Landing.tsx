import { useEffect, useRef, useState } from "react";
import Room from "./Room";

const Landing = () => {
	const [name, setName] = useState<string>("");
	const [joined, setJoined] = useState<boolean>(false);
	const [localVideoTrack, setLocalVideoTrack] =
		useState<MediaStreamTrack | null>(null);
	const [localAudioTrack, setLocalAudioTrack] =
		useState<MediaStreamTrack | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const joinRoom = () => {
		if (!localAudioTrack || !localVideoTrack || !name) return;
		setJoined(true);
	};

	const getCam = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true,
		});
		const videoTracks = stream.getVideoTracks()[0];
		const audioTracks = stream.getAudioTracks()[0];
		setLocalAudioTrack(audioTracks);
		setLocalVideoTrack(videoTracks);
		videoRef.current!.srcObject = new MediaStream([videoTracks]);
		videoRef.current?.play();
	};

	useEffect(() => {
		if (videoRef && videoRef.current) {
			getCam();
		}
	}, [videoRef]);

	if (!joined) {
		return (
			<div>
				<video ref={videoRef}></video>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<button onClick={joinRoom}>Join Room</button>
			</div>
		);
	} else {
		return (
			<Room
				name={name}
				localAudioTrack={localAudioTrack!}
				localVideoTrack={localVideoTrack!}
			/>
		);
	}
};

export default Landing;
