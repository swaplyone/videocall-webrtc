import React, { useState, useRef, useEffect } from 'react';
import './SwipeRequests.css';

/**
 * SwipeRequests component implements a card deck for pending friend requests.
 * Uses pointer events for touch & mouse drag gestures, with rotation and visual feedback.
 */
export default function SwipeRequests({ requests = [], onAccept, onReject }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'left' | 'right' | null
  const [exitingCard, setExitingCard] = useState(null); // { index, direction }
  
  const startPos = useRef({ x: 0, y: 0 });
  const SWIPE_THRESHOLD = 120; // px to commit swipe

  // Reset index when request array size changes or reset occurs
  useEffect(() => {
    if (currentIndex >= requests.length) {
      setCurrentIndex(Math.max(0, requests.length - 1));
    }
  }, [requests.length, currentIndex]);

  const activeRequest = requests[currentIndex];

  const handlePointerDown = (e) => {
    if (exitingCard) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    setDragOffset({ x: dx, y: dy });

    if (dx > 40) {
      setSwipeDirection('right');
    } else if (dx < -40) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);

    const dx = dragOffset.x;
    if (dx > SWIPE_THRESHOLD) {
      triggerExit('right');
    } else if (dx < -SWIPE_THRESHOLD) {
      triggerExit('left');
    } else {
      // Snap back to center
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  const triggerExit = (direction) => {
    setExitingCard({ index: currentIndex, direction });
    setDragOffset({ x: direction === 'right' ? 500 : -500, y: dragOffset.y });
    setSwipeDirection(null);

    setTimeout(() => {
      const reqToResolve = requests[currentIndex];
      if (direction === 'right') {
        onAccept(reqToResolve.id);
      } else {
        onReject(reqToResolve.id);
      }
      
      setCurrentIndex(prev => prev + 1);
      setDragOffset({ x: 0, y: 0 });
      setExitingCard(null);
    }, 300); // Wait for transition animation
  };

  const handleButtonAction = (direction) => {
    if (exitingCard || !activeRequest) return;
    triggerExit(direction);
  };

  if (requests.length === 0 || currentIndex >= requests.length) {
    return (
      <div className="swipe-empty-state">
        <div className="swipe-empty-icon">🤝</div>
        <h3>No Pending Invites</h3>
        <p>Your connection inbox is empty. Share your Beta ID or scan a QR code to discover friends!</p>
      </div>
    );
  }

  // Calculate rotation and translation style
  const rotateDeg = dragOffset.x * 0.1;
  const cardStyle = {
    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotateDeg}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
  };

  return (
    <div className="swipe-deck-container">
      <div className="swipe-deck-header">
        <h4>Connection Requests ({requests.length - currentIndex} remaining)</h4>
      </div>

      <div className="swipe-card-wrapper">
        <div 
          className="swipe-card glass-panel" 
          style={cardStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Paper Craft Clip Accent */}
          <div className="paper-clip-badge">📎</div>

          {/* Visual indicators */}
          {swipeDirection === 'right' && <div className="swipe-badge accept-badge">ACCEPT</div>}
          {swipeDirection === 'left' && <div className="swipe-badge reject-badge">REJECT</div>}

          {/* Profile Card Contents */}
          <div className="swipe-avatar-container">
            {activeRequest.profile_image ? (
              <img src={activeRequest.profile_image} alt={activeRequest.name} className="swipe-avatar" />
            ) : (
              <div className="swipe-avatar-placeholder">
                {activeRequest.name ? activeRequest.name.substring(0, 2).toUpperCase() : '??'}
              </div>
            )}
          </div>

          <div className="swipe-profile-info">
            <h3 className="swipe-profile-name">{activeRequest.name || 'Beta User'}</h3>
            <div className="swipe-profile-username">@{activeRequest.username}</div>
            {activeRequest.beta_id && (
              <div className="swipe-profile-beta-id">{activeRequest.beta_id}</div>
            )}
          </div>

          <div className="swipe-card-hint">
            Drag right to Connect • Drag left to Pass
          </div>
        </div>

        {/* Peek background card if there is a next one */}
        {currentIndex + 1 < requests.length && (
          <div className="swipe-card-peek glass-panel"></div>
        )}
      </div>

      {/* Accessible Action Buttons */}
      <div className="swipe-actions-container">
        <button 
          className="swipe-btn reject-btn"
          onClick={() => handleButtonAction('left')}
          disabled={!!exitingCard}
          aria-label="Reject Friend Request"
        >
          ✕ Pass
        </button>
        <button 
          className="swipe-btn accept-btn"
          onClick={() => handleButtonAction('right')}
          disabled={!!exitingCard}
          aria-label="Accept Friend Request"
        >
          ✓ Connect
        </button>
      </div>
    </div>
  );
}
