import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const URL = import.meta.env.VITE_BACKEND_URL;

const Room = ({
	name,
	localAudioTrack,
	localVideoTrack,
}: {
	name: string;
	localAudioTrack: MediaStreamTrack;
	localVideoTrack: MediaStreamTrack;
}) => {
	const [, setSocket] = useState<Socket | null>(null);
	const [lobby, setLobby] = useState(true);
	const [, setSendingPC] = useState<RTCPeerConnection | null>(null);
	const [, setReceivingPC] = useState<RTCPeerConnection | null>(null);
	const [remoteVideoTrack, setRemoteVideoTrack] =
		useState<MediaStreamTrack | null>(null);
	const [remoteAudioTrack, setRemoteAudioTrack] =
		useState<MediaStreamTrack | null>(null);
	const [remoteMediaStream, setRemoteMediaStream] =
		useState<MediaStream | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
	const localVideoRef = useRef<HTMLVideoElement | null>(null);

	useEffect(() => {
		const socket = io(URL);
		setSocket(socket);

		socket.on("send-offer", async ({ roomID }) => {
			setLobby(false);

			const pc = new RTCPeerConnection();
			setSendingPC(pc);

			pc.addTrack(localAudioTrack);
			pc.addTrack(localVideoTrack);
			setRemoteMediaStream(new MediaStream([localAudioTrack, localVideoTrack]));

			pc.onicecandidate = async () => {
				const sdp = await pc.createOffer();
				socket.emit("offer", {
					sdp,
					roomID,
				});
			};
		});

		socket.on("offer", async ({ sdp, roomID }) => {
			setLobby(false);

			const pc = new RTCPeerConnection();
			setReceivingPC(pc);
			pc.setRemoteDescription({ sdp, type: "offer" });

			const answer = await pc.createAnswer();
			socket.emit("answer", {
				sdp: answer,
				roomID,
			});

			pc.ontrack = ({ track, type }) => {
				if (type === "audio") {
					setRemoteAudioTrack(track);
				} else if (type === "video") {
					setRemoteVideoTrack(track);
				}
				const stream = new MediaStream([remoteAudioTrack!, remoteVideoTrack!]);
				setRemoteMediaStream(stream);
			};
		});

		socket.on("answer", ({ sdp }) => {
			setLobby(false);

			setSendingPC((pc) => {
				if (pc) {
					pc.setRemoteDescription({ sdp, type: "answer" });
				}
				return pc;
			});
		});

		socket.on("lobby", () => {
			setLobby(true);
		});
	}, []);

	useEffect(() => {
		if (remoteVideoRef.current) {
			remoteVideoRef.current.srcObject = remoteMediaStream;
			remoteVideoRef.current.play();
		}
		if (localVideoRef.current) {
			localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
			localVideoRef.current.play();
		}
	}, [remoteVideoRef, localVideoRef, remoteMediaStream, localVideoTrack]);

	if (lobby) {
		return (
			<div>
				Waiting for you to connect to someone
				<video width={400} height={400} ref={localVideoRef} />
			</div>
		);
	}

	return (
		<div>
			Hi {name}
			<video width={400} height={400} ref={localVideoRef} />
			<video width={400} height={400} ref={remoteVideoRef} />
		</div>
	);
};

export default Room;
